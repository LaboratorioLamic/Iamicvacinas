// ─── OPORTUNIDADES DE VENDA ────────────────────────────────────────────────────

let _oppSubTab = 'aprazamento'; // 'aprazamento' | 'oferta'

let _oppFilter = {
    aprazamento: { search: '', vacina: '', urgencia: '', ticketMin: '', ticketMax: '' },
    oferta:      { search: '', vacina: '', ticketMin: '', ticketMax: '' }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function _urgency(date, today, in30) {
    if (!date) return 'sem_data';
    if (date < today) return 'vencida';
    if (date <= in30) return 'proxima';
    return 'futura';
}

function _urgencyLabel(u) {
    return { vencida:'Vencida', proxima:'Próxima', futura:'Futura', sem_data:'Sem data' }[u] || u;
}

function _urgencyClasses(u) {
    return {
        vencida:  'bg-red-100 text-red-700 border-red-200',
        proxima:  'bg-amber-100 text-amber-700 border-amber-200',
        futura:   'bg-green-100 text-green-700 border-green-200',
        sem_data: 'bg-slate-100 text-slate-500 border-slate-200'
    }[u] || 'bg-slate-100 text-slate-500 border-slate-200';
}

function _typeIcon(type) {
    return { proxima_dose:'fa-syringe', dose_unica_repetivel:'fa-redo-alt', reforco:'fa-shield-virus' }[type] || 'fa-syringe';
}

function _appliedCount(patId) {
    return appointments.filter(a => a.patientId == patId && a.status === 'Aplicado').length;
}

function _patientFitsVaccine(patient, vac) {
    // Restrição de gênero
    if (vac.sexo && vac.sexo !== 'Ambos' && patient.genero && patient.genero !== vac.sexo) return false;

    // Restrição de idade
    if (patient.dtNasc) {
        const ai = getAgeInMonths(patient.dtNasc);
        const totalMeses = ai.years * 12 + ai.months;

        if (vac.esquemas && vac.esquemas.length) {
            return vac.esquemas.some(esq => {
                if (esq.minAnos == null) return true;
                const minT = (esq.minAnos || 0) * 12 + (esq.minMeses || 0);
                const hasMax = esq.maxAnos != null || esq.maxMeses != null;
                const maxT = hasMax ? ((esq.maxAnos || 0) * 12 + (esq.maxMeses || 0)) : Infinity;
                return totalMeses >= minT && totalMeses <= maxT;
            });
        }

        const minMeses = (vac.idadeMinimaAnos || 0) * 12 + (vac.idadeMinimaMeses || 0);
        if (minMeses > 0 && totalMeses < minMeses) return false;
    }
    return true;
}

function _firstDoseLabel(vac, patient) {
    const esq = getEsquemaPaciente(vac, patient ? patient.dtNasc : null);
    const n = esq ? (esq.numDoses || 1) : (vac.numDoses || 1);
    return n === 1 ? 'Dose Única' : '1ª Dose';
}

// ── Calc: Aprazamento ─────────────────────────────────────────────────────────

function calcAprazamento() {
    const today = new Date(); today.setHours(0,0,0,0);
    const in30  = new Date(today); in30.setDate(in30.getDate() + 30);
    const byPatient = {};

    patients.forEach(patient => {
        const patApps    = appointments.filter(a => a.patientId === patient.id);
        // "Efetivamente tomada" = Aplicado OU Perdido com aplicadaOutroLocal=true
        const appliedApps = patApps.filter(a =>
            a.status === 'Aplicado' || (a.status === 'Perdido' && a.aplicadaOutroLocal)
        );
        if (!appliedApps.length) return;
        // "Ativa" = tudo exceto Aplicado e Perdido+outroLocal.
        // Perdido sem outroLocal SUPRIME — a oportunidade já foi descartada/perdida.
        const activeApps = patApps.filter(a =>
            a.status !== 'Aplicado' && !(a.status === 'Perdido' && a.aplicadaOutroLocal)
        );

        const byVac = {};
        appliedApps.forEach(a => { if (!byVac[a.vaccineId]) byVac[a.vaccineId] = []; byVac[a.vaccineId].push(a); });

        const opps = [];

        Object.keys(byVac).forEach(vacId => {
            const vac = vaccines.find(v => v.id == vacId);
            if (!vac || vac.ativo === false) return;

            const applied   = byVac[vacId]; // apenas Aplicado
            const active    = activeApps.filter(a => a.vaccineId == vacId); // ativas (suprimem)
            const esq       = getEsquemaPaciente(vac, patient.dtNasc);
            const numDoses  = esq ? (esq.numDoses || 1) : (vac.numDoses || 1);

            // Case 1 — próxima dose
            // Usa o máximo de doses entre todos os esquemas da vacina, não só o esquema atual
            // do paciente. Assim, "1ª Dose" sempre gera "2ª Dose" mesmo que o paciente tenha
            // envelhecido para fora da faixa do esquema multi-dose.
            const appliedNums = applied
                .filter(a => a.doseAtual && /^\d+ª Dose$/.test(a.doseAtual))
                .map(a => parseInt(a.doseAtual));

            if (appliedNums.length) {
                const maxApplied = Math.max(...appliedNums);
                const totalDoses = vac.esquemas && vac.esquemas.length
                    ? Math.max(...vac.esquemas.map(e => e.numDoses || 1))
                    : numDoses;
                if (maxApplied < totalDoses) {
                    const nextDoseStr = `${maxApplied + 1}ª Dose`;
                    // Suprime se já existe registro ativo (não-Perdido) para esta dose
                    if (!active.some(a => a.doseAtual === nextDoseStr)) {
                        const lastBase = applied
                            .filter(a => a.doseAtual === `${maxApplied}ª Dose`)
                            .sort((a, b) => new Date(b.data) - new Date(a.data))[0];

                        let suggestedDate = null;
                        if (lastBase) {
                            const intervalos = (esq && esq.intervalos && esq.intervalos.length) ? esq.intervalos
                                : (vac.intervalos && vac.intervalos.length ? vac.intervalos
                                    : (vac.intervaloDias > 0 ? [vac.intervaloDias] : []));
                            let intervalo = intervalos.length
                                ? (intervalos[maxApplied - 1] != null ? intervalos[maxApplied - 1] : intervalos[intervalos.length - 1])
                                : 30;
                            if (!intervalo || intervalo <= 0) intervalo = 30;
                            const baseDate = new Date(lastBase.data + 'T00:00:00');
                            const calcDate = new Date(baseDate); calcDate.setDate(calcDate.getDate() + intervalo);
                            // Se a data sugerida já passou, usa hoje como base para não mostrar data no passado distante
                            suggestedDate = calcDate < today ? today : calcDate;
                        }
                        opps.push({ type:'proxima_dose', vaccine:vac, dose:nextDoseStr, suggestedDate, revenue: parseBRL(String(vac.valor||'0'))||0, urgency:_urgency(suggestedDate,today,in30) });
                    }
                }
            }

            // Case 2 — dose única repetível
            // Só dispara se o esquema aplicável ao paciente for de dose única (numDoses===1).
            // Se o paciente se encaixa num esquema multi-dose, o repeat anual não se aplica a ele.
            const repScheme = vac.esquemas && vac.esquemas.find(e => e.numDoses===1 && e.repete && e.repeteMeses>0);
            if (repScheme && numDoses === 1) {
                const lastDU = applied.filter(a=>a.doseAtual==='Dose Única').sort((a,b)=>new Date(b.data)-new Date(a.data))[0];
                // Suprime se já existe registro ativo futuro para Dose Única
                const hasActiveDU = active.some(a => a.doseAtual === 'Dose Única' && new Date(a.data+'T00:00:00') >= today);
                if (lastDU && !hasActiveDU) {
                    const nextDate = new Date(lastDU.data+'T00:00:00');
                    nextDate.setMonth(nextDate.getMonth() + repScheme.repeteMeses);
                    opps.push({ type:'dose_unica_repetivel', vaccine:vac, dose:'Dose Única', suggestedDate:nextDate, revenue:parseBRL(String(vac.valor||'0'))||0, urgency:_urgency(nextDate,today,in30) });
                }
            }

            // Case 3 — reforço
            if (vac.reforco) {
                const hasReforco = applied.some(a=>a.doseAtual==='Reforço');
                // Suprime se já existe registro ativo para Reforço
                const hasActiveReforco = active.some(a => a.doseAtual === 'Reforço');
                if (!hasReforco && !hasActiveReforco) {
                    const completed = numDoses===1
                        ? applied.some(a=>a.doseAtual==='Dose Única'||a.doseAtual==='1ª Dose')
                        : applied.some(a=>a.doseAtual===`${numDoses}ª Dose`);
                    if (completed) {
                        const lastApp = applied.sort((a,b)=>new Date(b.data)-new Date(a.data))[0];
                        let suggestedDate = null;
                        if (lastApp) {
                            const intervalos = (esq && esq.intervalos && esq.intervalos.length) ? esq.intervalos : [];
                            const intervalo = intervalos[numDoses] || vac.intervaloDias || 365;
                            const d = new Date(lastApp.data+'T00:00:00');
                            d.setDate(d.getDate() + intervalo);
                            suggestedDate = d;
                        }
                        opps.push({ type:'reforco', vaccine:vac, dose:'Reforço', suggestedDate, revenue:parseBRL(String(vac.valor||'0'))||0, urgency:_urgency(suggestedDate,today,in30) });
                    }
                }
            }
        });

        if (opps.length) byPatient[patient.id] = { patient, opps };
    });

    return Object.values(byPatient);
}

// ── Calc: Oferta ──────────────────────────────────────────────────────────────

function calcOferta() {
    const byPatient = {};

    patients.forEach(patient => {
        const usedVacIds = new Set(
            appointments
                .filter(a => a.patientId == patient.id)
                .map(a => Number(a.vaccineId))
        );

        const offers = vaccines
            .filter(v => v.ativo !== false && !usedVacIds.has(Number(v.id)) && _patientFitsVaccine(patient, v))
            .map(v => ({
                type: 'oferta',
                vaccine: v,
                dose: _firstDoseLabel(v, patient),
                suggestedDate: null,
                revenue: parseBRL(String(v.valor || '0')) || 0,
                urgency: 'sem_data'
            }));

        if (offers.length) byPatient[patient.id] = { patient, opps: offers };
    });

    return Object.values(byPatient);
}

// ── Sort ──────────────────────────────────────────────────────────────────────

function _sortGroups(groups, isAprazamento) {
    const urgOrder = { vencida:0, proxima:1, futura:2, sem_data:3 };

    return groups.sort((a, b) => {
        // Primário: mais vacinas aplicadas (fidelidade)
        const ca = _appliedCount(a.patient.id);
        const cb = _appliedCount(b.patient.id);
        if (cb !== ca) return cb - ca;

        // Secundário (só aprazamento): urgência
        if (isAprazamento) {
            const aU = Math.min(...a.opps.map(o => urgOrder[o.urgency] ?? 9));
            const bU = Math.min(...b.opps.map(o => urgOrder[o.urgency] ?? 9));
            if (aU !== bU) return aU - bU;
        }

        // Terciário: receita potencial
        const ra = a.opps.reduce((s,o)=>s+o.revenue,0);
        const rb = b.opps.reduce((s,o)=>s+o.revenue,0);
        return rb - ra;
    });
}

// ── Sub-abas ──────────────────────────────────────────────────────────────────

function switchOppSubTab(tab) {
    _oppSubTab = tab;
    ['aprazamento','oferta'].forEach(t => {
        const btn = document.getElementById(`btn-opp-sub-${t}`);
        const fil = document.getElementById(`opp-filters-${t}`);
        const active = t === tab;
        if (btn) {
            btn.classList.toggle('bg-navy-900', active);
            btn.classList.toggle('text-white',   active);
            btn.classList.toggle('border-navy-800', active);
            btn.classList.toggle('bg-white',      !active);
            btn.classList.toggle('text-slate-500',!active);
            btn.classList.toggle('border-slate-300',!active);
        }
        if (fil) fil.classList.toggle('hidden', !active);
    });
    closeTicketPopover();
    populateOppVacinaFilter();
    renderOportunidades();
}

// ── Ticket Popover ────────────────────────────────────────────────────────────

let _ticketAnchorTab = '';

function openTicketPopover(btn) {
    _ticketAnchorTab = _oppSubTab;
    const pop = document.getElementById('opp-ticket-popover');
    if (!pop) return;

    const f = _oppFilter[_ticketAnchorTab];
    document.getElementById('opp-ticket-min').value = f.ticketMin || '';
    document.getElementById('opp-ticket-max').value = f.ticketMax || '';

    const rect = btn.getBoundingClientRect();
    pop.style.top  = (rect.bottom + 8) + 'px';
    pop.style.left = Math.max(8, rect.left - 200 + rect.width) + 'px';
    pop.classList.remove('hidden');

    setTimeout(() => document.addEventListener('click', _ticketOutside, { once:true }), 10);
}

function _ticketOutside(e) {
    const pop = document.getElementById('opp-ticket-popover');
    if (pop && !pop.contains(e.target)) closeTicketPopover();
}

function closeTicketPopover() {
    const pop = document.getElementById('opp-ticket-popover');
    if (pop) pop.classList.add('hidden');
}

function applyTicketFilter() {
    const minVal = parseFloat(document.getElementById('opp-ticket-min').value) || '';
    const maxVal = parseFloat(document.getElementById('opp-ticket-max').value) || '';
    _oppFilter[_ticketAnchorTab].ticketMin = minVal;
    _oppFilter[_ticketAnchorTab].ticketMax = maxVal;
    closeTicketPopover();
    _updateTicketBadge(_ticketAnchorTab);
    renderOportunidades();
}

function clearTicketFilter() {
    _oppFilter[_ticketAnchorTab].ticketMin = '';
    _oppFilter[_ticketAnchorTab].ticketMax = '';
    document.getElementById('opp-ticket-min').value = '';
    document.getElementById('opp-ticket-max').value = '';
    closeTicketPopover();
    _updateTicketBadge(_ticketAnchorTab);
    renderOportunidades();
}

function _updateTicketBadge(tab) {
    const btn = document.getElementById(`opp-ticket-btn-${tab}`);
    if (!btn) return;
    const f = _oppFilter[tab];
    const active = f.ticketMin !== '' || f.ticketMax !== '';
    btn.classList.toggle('bg-indigo-600', active);
    btn.classList.toggle('text-white', active);
    btn.classList.toggle('border-indigo-600', active);
    btn.classList.toggle('bg-white', !active);
    btn.classList.toggle('text-slate-600', !active);
    btn.classList.toggle('border-slate-200', !active);
    const lbl = btn.querySelector('.ticket-lbl');
    if (lbl) {
        if (active) {
            const min = f.ticketMin !== '' ? `R$ ${Number(f.ticketMin).toFixed(0)}` : '';
            const max = f.ticketMax !== '' ? `R$ ${Number(f.ticketMax).toFixed(0)}` : '';
            lbl.textContent = [min, max].filter(Boolean).join(' – ');
        } else {
            lbl.textContent = 'Ticket';
        }
    }
}

function _passTicket(revenue, tab) {
    const f = _oppFilter[tab];
    if (f.ticketMin !== '' && revenue < f.ticketMin) return false;
    if (f.ticketMax !== '' && revenue > f.ticketMax) return false;
    return true;
}

// ── Render principal ──────────────────────────────────────────────────────────

function renderOportunidades() {
    if (_oppSubTab === 'aprazamento') _renderAprazamento();
    else _renderOferta();
}

function _applyCommonFilters(groups, tab) {
    const f       = _oppFilter[tab];
    const search  = normalizeStr(f.search || '');
    const vacFilt = f.vacina || '';

    return groups.map(pg => ({
        ...pg,
        opps: pg.opps.filter(o => {
            if (vacFilt && String(o.vaccine.id) !== String(vacFilt)) return false;
            return true;
        })
    })).filter(pg => {
        if (!pg.opps.length) return false;
        // Ticket aplica sobre o potencial total do paciente
        const totalRev = pg.opps.reduce((s, o) => s + o.revenue, 0);
        if (!_passTicket(totalRev, tab)) return false;
        if (search) {
            const p = pg.patient;
            return normalizeStr(p.nome).includes(search) || normalizeStr(p.cpf||'').includes(search);
        }
        return true;
    });
}

function _renderAprazamento() {
    const urgOrder = { vencida:0, proxima:1, futura:2, sem_data:3 };
    const f = _oppFilter.aprazamento;

    let groups = calcAprazamento();
    if (f.urgencia) groups = groups.map(pg => ({ ...pg, opps: pg.opps.filter(o=>o.urgency===f.urgencia) })).filter(pg=>pg.opps.length);
    groups = _applyCommonFilters(groups, 'aprazamento');
    groups.forEach(pg => pg.opps.sort((a,b)=>(urgOrder[a.urgency]??9)-(urgOrder[b.urgency]??9)));
    _sortGroups(groups, true);

    const totOpps = groups.reduce((s,pg)=>s+pg.opps.length,0);
    const totRev  = groups.reduce((s,pg)=>s+pg.opps.reduce((ss,o)=>ss+o.revenue,0),0);
    const totVenc = groups.reduce((s,pg)=>s+pg.opps.filter(o=>o.urgency==='vencida').length,0);
    const totProx = groups.reduce((s,pg)=>s+pg.opps.filter(o=>o.urgency==='proxima').length,0);

    _renderStats(groups.length, totOpps, totRev, totVenc, totProx);
    _renderCards(groups, 'aprazamento');
}

function _renderOferta() {
    let groups = calcOferta();
    groups = _applyCommonFilters(groups, 'oferta');
    _sortGroups(groups, false);

    const totOpps = groups.reduce((s,pg)=>s+pg.opps.length,0);
    const totRev  = groups.reduce((s,pg)=>s+pg.opps.reduce((ss,o)=>ss+o.revenue,0),0);

    _renderStats(groups.length, totOpps, totRev, 0, 0, true);
    _renderCards(groups, 'oferta');
}

function _renderStats(npat, nopps, rev, nvenc, nprox, isOferta=false) {
    const el = document.getElementById('oport-stats');
    if (!el) return;
    el.innerHTML = `
        <div class="flex flex-wrap gap-3 items-center mb-4">
            <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                <i class="fas fa-users text-indigo-500 text-sm"></i>
                <span class="font-black text-navy-900">${npat}</span>
                <span class="text-xs text-slate-500 uppercase tracking-wide">Pacientes</span>
            </div>
            <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                <i class="fas fa-bullseye text-clinic-500 text-sm"></i>
                <span class="font-black text-navy-900">${nopps}</span>
                <span class="text-xs text-slate-500 uppercase tracking-wide">${isOferta ? 'Vacinas a oferecer' : 'Oportunidades'}</span>
            </div>
            <div class="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 shadow-sm">
                <i class="fas fa-dollar-sign text-emerald-600 text-sm"></i>
                <span class="font-black text-emerald-700">${formatCurrency(rev)}</span>
                <span class="text-xs text-emerald-600 uppercase tracking-wide">Receita potencial</span>
            </div>
            ${nvenc > 0 ? `<div class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2 shadow-sm"><i class="fas fa-exclamation-circle text-red-500 text-sm"></i><span class="font-black text-red-700">${nvenc}</span><span class="text-xs text-red-600 uppercase tracking-wide">Vencidas</span></div>` : ''}
            ${nprox > 0 ? `<div class="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 shadow-sm"><i class="fas fa-clock text-amber-500 text-sm"></i><span class="font-black text-amber-700">${nprox}</span><span class="text-xs text-amber-600 uppercase tracking-wide">Próx. 30 dias</span></div>` : ''}
        </div>`;
}

function _renderCards(groups, tab) {
    const container = document.getElementById('oport-cards-container');
    const emptyEl   = document.getElementById('oport-empty');
    if (!container) return;

    if (!groups.length) {
        container.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');
    container.innerHTML = groups.map(pg => _renderPatientCard(pg, tab)).join('');
}

// ── Cards ─────────────────────────────────────────────────────────────────────

function _renderPatientCard({ patient, opps }, tab) {
    const totalRev = opps.reduce((s,o)=>s+o.revenue,0);
    const applCount = _appliedCount(patient.id);
    const hasVenc  = opps.some(o=>o.urgency==='vencida');
    const hasProx  = opps.some(o=>o.urgency==='proxima');

    const borderCls = hasVenc ? 'border-red-300' : hasProx ? 'border-amber-300' : 'border-slate-200';
    const topBg     = hasVenc ? 'from-red-50 to-white' : hasProx ? 'from-amber-50 to-white' : 'from-slate-50 to-white';

    const age   = patient.dtNasc ? getAgeDisplay(patient.dtNasc) : '';
    const phone = patient.contato ? formatPhone(patient.contato) : '';
    const waNum = patient.contato ? ('55' + patient.contato.replace(/\D/g,'')) : '';
    const waHref = waNum ? `https://wa.me/${waNum}` : '';

    const micro = opps.map(o => tab==='oferta' ? _renderMicroOferta(patient, o) : _renderMicroAprazamento(patient, o)).join('');

    return `
    <div class="bg-white rounded-2xl shadow-sm border ${borderCls} overflow-hidden transition hover:shadow-md">
        <div class="px-5 py-4 bg-gradient-to-r ${topBg} border-b border-slate-100 flex flex-wrap justify-between items-start gap-3">
            <div class="flex items-center gap-3 min-w-0">
                <div class="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 font-black text-sm">
                    ${(patient.nome||'?')[0].toUpperCase()}
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-2">
                        <p class="font-black text-navy-900 text-sm truncate">${patient.nome||'—'}</p>
                        ${waHref ? `<a href="${waHref}" target="_blank" rel="noopener" title="Abrir WhatsApp" class="shrink-0 h-6 w-6 rounded-lg bg-green-100 hover:bg-green-500 text-green-600 hover:text-white flex items-center justify-center transition"><i class="fab fa-whatsapp text-[11px]"></i></a>` : ''}
                    </div>
                    <p class="text-[11px] text-slate-500 truncate">${patient.cpf||''}${age?` · ${age}`:''}${phone?` · ${phone}`:''}</p>
                </div>
            </div>
            <div class="flex items-center gap-3 shrink-0">
                <div class="text-right" title="Vacinas já aplicadas com a clínica">
                    <div class="text-[10px] text-slate-400 uppercase tracking-wide">Fidelidade</div>
                    <div class="font-black text-indigo-600 text-sm">${applCount} dose${applCount!==1?'s':''}</div>
                </div>
                <div class="text-right">
                    <div class="text-[10px] text-slate-400 uppercase tracking-wide">Potencial</div>
                    <div class="font-black text-emerald-600 text-sm">${formatCurrency(totalRev)}</div>
                </div>
                <div class="text-right">
                    <div class="text-[10px] text-slate-400 uppercase tracking-wide">Oport.</div>
                    <div class="font-black text-navy-900 text-sm">${opps.length}</div>
                </div>
                <button onclick="viewPatientHistory(${patient.id})" title="Ver prontuário vacinal"
                    class="h-8 w-8 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-500 hover:text-white flex items-center justify-center transition border border-indigo-100 hover:border-indigo-600 shrink-0">
                    <i class="fas fa-clipboard-list text-xs"></i>
                </button>
            </div>
        </div>
        <div class="p-4 flex flex-wrap gap-2">${micro}</div>
    </div>`;
}

function _renderMicroAprazamento(patient, opp) {
    const urg    = opp.urgency;
    const urgCls = _urgencyClasses(urg);
    const bCls   = urgCls.split(' ').find(c=>c.startsWith('border-')) || 'border-slate-200';
    const icon   = _typeIcon(opp.type);
    const dateStr = opp.suggestedDate ? opp.suggestedDate.toISOString().split('T')[0].split('-').reverse().join('/') : '—';
    const isoDate = opp.suggestedDate ? opp.suggestedDate.toISOString().split('T')[0] : '';

    const daysLabel = opp.suggestedDate ? (() => {
        const t = new Date(); t.setHours(0,0,0,0);
        const d = Math.round((opp.suggestedDate - t) / 86400000);
        if (d < 0) return `<span class="text-red-500 font-bold">${Math.abs(d)}d atraso</span>`;
        if (d === 0) return `<span class="text-amber-600 font-bold">Hoje</span>`;
        return `<span class="text-slate-400">em ${d}d</span>`;
    })() : '';

    return `
    <div class="flex flex-col gap-1.5 bg-slate-50 border ${bCls} rounded-xl px-3 py-2.5 min-w-[155px] max-w-[215px] flex-1">
        <div class="flex items-center gap-1.5">
            <i class="fas ${icon} text-indigo-400 text-[10px]"></i>
            <span class="text-[11px] font-black text-navy-900 truncate leading-tight">${opp.vaccine.nome}</span>
        </div>
        <div class="flex items-center justify-between gap-1">
            <span class="text-[10px] font-bold text-slate-600">${opp.dose}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${urgCls}">${_urgencyLabel(urg)}</span>
        </div>
        <div class="flex items-center justify-between gap-1 text-[10px] text-slate-500">
            <span>${dateStr} ${daysLabel}</span>
            <span class="font-bold text-emerald-600">${formatCurrency(opp.revenue)}</span>
        </div>
        <div class="mt-0.5 flex gap-1">
            <button onclick="agendarOportunidade(${patient.id},${opp.vaccine.id},'${opp.dose.replace(/'/g,"\\'")}','${isoDate}')"
                class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wide py-1.5 rounded-lg transition shadow-sm">
                <i class="fas fa-calendar-plus mr-1"></i>Agendar
            </button>
            <button onclick="openDismissOppModal(${patient.id},${opp.vaccine.id},'${opp.dose.replace(/'/g,"\\'")}')"
                title="Descartar oportunidade"
                class="h-[30px] w-7 bg-slate-200 hover:bg-red-500 text-slate-500 hover:text-white rounded-lg flex items-center justify-center transition shrink-0">
                <i class="fas fa-trash text-[9px]"></i>
            </button>
        </div>
    </div>`;
}

function _renderMicroOferta(patient, opp) {
    const esq = getEsquemaPaciente(opp.vaccine, patient.dtNasc);
    const numDoses = esq ? (esq.numDoses || 1) : (opp.vaccine.numDoses || 1);
    const doseInfo = numDoses > 1 ? `${numDoses} doses` : 'Dose única';
    const reforco  = opp.vaccine.reforco ? ' + Reforço' : '';

    return `
    <div class="flex flex-col gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 min-w-[155px] max-w-[215px] flex-1">
        <div class="flex items-center gap-1.5">
            <i class="fas fa-tags text-emerald-500 text-[10px]"></i>
            <span class="text-[11px] font-black text-navy-900 truncate leading-tight">${opp.vaccine.nome}</span>
        </div>
        <div class="flex items-center justify-between gap-1">
            <span class="text-[10px] font-bold text-slate-600">${doseInfo}${reforco}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 font-bold">Nova</span>
        </div>
        <div class="flex items-center justify-end gap-1 text-[10px]">
            <span class="font-black text-emerald-700">${formatCurrency(opp.revenue)}</span>
        </div>
        <div class="mt-0.5 flex gap-1">
            <button onclick="agendarOportunidade(${patient.id},${opp.vaccine.id},'${opp.dose.replace(/'/g,"\\'")}','')"
                class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wide py-1.5 rounded-lg transition shadow-sm">
                <i class="fas fa-calendar-plus mr-1"></i>Agendar
            </button>
            <button onclick="openDismissOppModal(${patient.id},${opp.vaccine.id},'${opp.dose.replace(/'/g,"\\'")}')"
                title="Descartar oportunidade"
                class="h-[30px] w-7 bg-slate-200 hover:bg-red-500 text-slate-500 hover:text-white rounded-lg flex items-center justify-center transition shrink-0">
                <i class="fas fa-trash text-[9px]"></i>
            </button>
        </div>
    </div>`;
}

// ── Descartar oportunidade ────────────────────────────────────────────────────

let _dismissPending = null; // { patId, vacId, dose }

function openDismissOppModal(patId, vacId, dose) {
    const p = patients.find(x => x.id == patId);
    const v = vaccines.find(x => x.id == vacId);
    _dismissPending = { patId, vacId, dose };

    const infoEl = document.getElementById('dismiss-opp-info');
    if (infoEl) infoEl.textContent = `${p ? p.nome : '—'} · ${v ? v.nome : '—'} · ${dose}`;

    const sel = document.getElementById('dismiss-opp-reason');
    if (sel) {
        sel.innerHTML = '<option value="">Selecione o motivo...</option>' +
            (typeof cancelReasons !== 'undefined' ? cancelReasons : []).map(r => `<option value="${r}">${r}</option>`).join('');
        sel.value = '';
    }

    const errEl = document.getElementById('dismiss-opp-err');
    if (errEl) errEl.classList.add('hidden');

    const dataInput = document.getElementById('dismiss-opp-data');
    if (dataInput) dataInput.value = new Date().toISOString().split('T')[0];

    document.getElementById('modal-dismiss-opp').classList.add('active');
}

function closeDismissOppModal() {
    document.getElementById('modal-dismiss-opp').classList.remove('active');
    _dismissPending = null;
    const chk = document.getElementById('dismiss-opp-outro-local');
    if (chk) { chk.checked = false; toggleDismissOutroLocal(chk); }
}

function toggleDismissOutroLocal(chk) {
    const icon      = document.getElementById('icon-dismiss-outro-local');
    const box       = chk.closest('label') && chk.closest('label').querySelector('div');
    const motivoSel = document.getElementById('dismiss-opp-reason');
    if (chk.checked) {
        if (icon) { icon.classList.remove('text-violet-400'); icon.classList.add('text-white'); }
        if (box)  { box.classList.add('bg-violet-600', 'border-violet-600'); box.classList.remove('bg-violet-50', 'border-violet-300'); }
        if (motivoSel) {
            motivoSel.disabled = true;
            motivoSel.classList.add('opacity-40', 'cursor-not-allowed', 'bg-slate-100');
        }
    } else {
        if (icon) { icon.classList.add('text-violet-400'); icon.classList.remove('text-white'); }
        if (box)  { box.classList.remove('bg-violet-600', 'border-violet-600'); box.classList.add('bg-violet-50', 'border-violet-300'); }
        if (motivoSel) {
            motivoSel.disabled = false;
            motivoSel.classList.remove('opacity-40', 'cursor-not-allowed', 'bg-slate-100');
        }
    }
}

function confirmDismissOpp() {
    const aplicadaOutroLocal = document.getElementById('dismiss-opp-outro-local')?.checked || false;
    const motivo = document.getElementById('dismiss-opp-reason').value;
    if (!motivo && !aplicadaOutroLocal) {
        document.getElementById('dismiss-opp-err').classList.remove('hidden');
        return;
    }
    if (!_dismissPending) return;

    const { patId, vacId, dose } = _dismissPending;
    const vac   = vaccines.find(x => x.id == vacId);
    const dataPerda = document.getElementById('dismiss-opp-data')?.value || new Date().toISOString().split('T')[0];
    const vendedorNome = (typeof currentUser !== 'undefined' && currentUser)
        ? (currentUser.nome || '').toUpperCase()
        : '';

    const newApp = {
        id:                 Date.now(),
        patientId:          Number(patId),
        vaccineId:          Number(vacId),
        data:               dataPerda,
        hora:               '',
        doseAtual:          dose,
        valorAplicado:      String(vac ? (vac.valor || '0,00') : '0,00').replace('R$','').trim(),
        valorCheio:         null,
        descontoPct:        null,
        status:             'Perdido',
        loteId:             null,
        lote:               '',
        motivoCancelamento: motivo,
        aplicadaOutroLocal: aplicadaOutroLocal,
        vendedor:           vendedorNome,
        aplicador:          ''
    };

    appointments.push(newApp);
    if (typeof syncAllLoteStatus === 'function') syncAllLoteStatus();
    saveAll();
    renderCalendar();
    renderTable();
    renderDashboard();

    closeDismissOppModal();
    renderOportunidades();
    showNotification('Oportunidade descartada e registrada como perdida.', 'success');
}

// ── Agendar ───────────────────────────────────────────────────────────────────

function agendarOportunidade(patId, vacId, dose, dataIso) {
    closeModals();
    openRecordModal();

    setTimeout(() => {
        const p = patients.find(x => x.id == patId);
        if (!p) return;

        const psEl = document.getElementById('reg-patient-search');
        psEl.value = `${p.cpf} - ${p.nome}`;
        psEl.setCustomValidity('');
        psEl.classList.remove('border-red-400');
        psEl.classList.add('border-slate-200');
        document.getElementById('hidden-patient-id').value = p.id;
        document.getElementById('reg-cpf').value = p.cpf;
        document.getElementById('reg-dtnasc').value = p.dtNasc;
        updateIdadeField();
        document.getElementById('reg-contato').value = formatPhone(p.contato);
        if (p.responsavel) {
            document.getElementById('div-responsavel').style.display = 'block';
            document.getElementById('div-responsavel-placeholder').style.display = 'none';
            document.getElementById('reg-responsavel').value = p.responsavel;
        }
        _enableVaccineFields();

        const vac = vaccines.find(x => x.id == vacId);
        document.getElementById('reg-vacina').value = vacId;
        document.getElementById('reg-vacina-search').value = vac ? vac.nome : '';
        autoFillVaccine();

        setTimeout(() => {
            document.getElementById('reg-dose').value = dose;
            document.getElementById('reg-data').value = new Date().toISOString().split('T')[0];
            updateSuggestedDate();
        }, 80);
    }, 120);
}

// ── Populadores de filtros ────────────────────────────────────────────────────

function populateOppVacinaFilter() {
    const selApr = document.getElementById('oport-filter-vacina-apr');
    const selOfe = document.getElementById('oport-filter-vacina-ofe');

    const appliedIds = new Set(appointments.filter(a=>a.status==='Aplicado').map(a=>a.vaccineId));
    const activeVacs = vaccines.filter(v=>v.ativo!==false).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));

    if (selApr) {
        const usedInApr = activeVacs.filter(v=>appliedIds.has(v.id));
        selApr.innerHTML = '<option value="">Todas as vacinas</option>' + usedInApr.map(v=>`<option value="${v.id}">${v.nome}</option>`).join('');
        selApr.value = _oppFilter.aprazamento.vacina || '';
    }
    if (selOfe) {
        selOfe.innerHTML = '<option value="">Todas as vacinas</option>' + activeVacs.map(v=>`<option value="${v.id}">${v.nome}</option>`).join('');
        selOfe.value = _oppFilter.oferta.vacina || '';
    }
}

// ── Handlers de filtro ────────────────────────────────────────────────────────

function oppFilterSearch(val, tab) { _oppFilter[tab].search = val; renderOportunidades(); }
function oppFilterVacina(val, tab) { _oppFilter[tab].vacina = val; renderOportunidades(); }
function oppFilterUrgencia(val)    { _oppFilter.aprazamento.urgencia = val; renderOportunidades(); }
