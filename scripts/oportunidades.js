// ─── OPORTUNIDADES DE VENDA ────────────────────────────────────────────────────

let _oppSubTab = 'aprazamento'; // 'aprazamento' | 'oferta'

let _oppFilter = {
    aprazamento: { search: '', vacina: '', vacinaIds: new Set(), urgencia: '', proxDias: 30, ticketMin: '', ticketMax: '' },
    oferta:      { search: '', vacina: '', vacinaIds: new Set(), ticketMin: '', ticketMax: '',
                   idadeMinAnos: '', idadeMinMeses: '', idadeMaxAnos: '', idadeMaxMeses: '',
                   genero: '', fidMin: '', fidMax: '' }
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
    const dias  = Number(_oppFilter.aprazamento.proxDias) || 30;
    const in30  = new Date(today); in30.setDate(in30.getDate() + dias);
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
                            const d = new Date(lastApp.data+'T00:00:00');
                            if (vac.reforcoMeses > 0) {
                                d.setMonth(d.getMonth() + vac.reforcoMeses);
                            } else {
                                const intervalos = (esq && esq.intervalos && esq.intervalos.length) ? esq.intervalos : [];
                                const intervalo = intervalos[numDoses] || vac.intervaloDias || 365;
                                d.setDate(d.getDate() + intervalo);
                            }
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
    const vacinaIds = f.vacinaIds && f.vacinaIds.size ? f.vacinaIds : null;

    return groups.map(pg => ({
        ...pg,
        opps: pg.opps.filter(o => {
            const id = String(o.vaccine ? o.vaccine.id : o.vaccineId);
            if (vacinaIds) { if (!vacinaIds.has(id)) return false; }
            else if (vacFilt && id !== String(vacFilt)) return false;
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
    _updateAprPrazoBadge();
    groups.forEach(pg => pg.opps.sort((a,b)=>(urgOrder[a.urgency]??9)-(urgOrder[b.urgency]??9)));
    _sortGroups(groups, true);

    const totOpps = groups.reduce((s,pg)=>s+pg.opps.length,0);
    const totRev  = groups.reduce((s,pg)=>s+pg.opps.reduce((ss,o)=>ss+o.revenue,0),0);
    const totVenc = groups.reduce((s,pg)=>s+pg.opps.filter(o=>o.urgency==='vencida').length,0);
    const totProx = groups.reduce((s,pg)=>s+pg.opps.filter(o=>o.urgency==='proxima').length,0);

    _renderStats(groups.length, totOpps, totRev, totVenc, totProx, false, _oppFilter.aprazamento.proxDias);
    _renderCards(groups, 'aprazamento');
}

function _renderOferta() {
    let groups = calcOferta();
    groups = _applyOfertaPatientFilters(groups);
    groups = _applyCommonFilters(groups, 'oferta');
    _sortGroups(groups, false);

    const totOpps = groups.reduce((s,pg)=>s+pg.opps.length,0);
    const totRev  = groups.reduce((s,pg)=>s+pg.opps.reduce((ss,o)=>ss+o.revenue,0),0);

    _renderStats(groups.length, totOpps, totRev, 0, 0, true);
    _renderCards(groups, 'oferta');
}

function _renderStats(npat, nopps, rev, nvenc, nprox, isOferta=false, proxDias=30) {
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
            ${nprox > 0 ? `<div class="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 shadow-sm"><i class="fas fa-clock text-amber-500 text-sm"></i><span class="font-black text-amber-700">${nprox}</span><span class="text-xs text-amber-600 uppercase tracking-wide">Próx. ${proxDias} dias</span></div>` : ''}
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
    // Selects foram substituídos por popovers — badges atualizados separadamente
    _updateAprVacinaBadge();
    _updateOfertaVacinaBadge();
}

// ── Handlers de filtro ────────────────────────────────────────────────────────

function oppFilterSearch(val, tab) { _oppFilter[tab].search = val; renderOportunidades(); }
function oppFilterVacina(val, tab) { _oppFilter[tab].vacina = val; renderOportunidades(); }
function oppFilterUrgencia(val)    { _oppFilter.aprazamento.urgencia = val; renderOportunidades(); }

// ── Popover Multi-Vacina genérico ─────────────────────────────────────────────

function _openVacinaPopover({ popId, searchId, listId, clearId, allVacs, filterFn, closeFn, anchorBtn }) {
    const pop = document.getElementById(popId);
    if (!pop) return;

    const searchEl = document.getElementById(searchId);
    if (searchEl) searchEl.value = '';
    filterFn('');

    const rect = anchorBtn.getBoundingClientRect();
    pop.style.top  = (rect.bottom + 8) + 'px';
    pop.style.left = '8px';
    pop.classList.remove('hidden');

    requestAnimationFrame(() => {
        const maxLeft = window.innerWidth - pop.offsetWidth - 8;
        pop.style.left = Math.max(8, Math.min(rect.left, maxLeft)) + 'px';
    });
}

function _renderVacinaList({ listId, allVacs, selSet, toggleFn, searchVal }) {
    const list = document.getElementById(listId);
    if (!list) return;
    const q = normalizeStr(searchVal || '');
    const filtered = q ? allVacs.filter(v => normalizeStr(v.nome).includes(q)) : allVacs;

    list.innerHTML = filtered.map(v => {
        const checked = selSet.has(String(v.id));
        return `<div class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer select-none transition vac-row ${checked ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'}" data-id="${v.id}">
            <div class="h-4 w-4 rounded flex items-center justify-center shrink-0 border-2 transition ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}">
                ${checked ? '<i class="fas fa-check text-white" style="font-size:8px"></i>' : ''}
            </div>
            <span class="text-sm text-navy-900 font-bold flex-1 leading-tight">${v.nome}</span>
        </div>`;
    }).join('') || '<p class="text-xs text-slate-400 text-center py-4">Nenhuma vacina encontrada</p>';

    list.querySelectorAll('.vac-row').forEach(row => {
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFn(row.dataset.id);
        });
    });
}

function _updateVacinaBadge({ btnId, lblClass, selSet }) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const lbl = btn.querySelector(`.${lblClass}`);
    const hasFilter = selSet.size > 0;

    btn.classList.toggle('bg-indigo-600', hasFilter);
    btn.classList.toggle('text-white', hasFilter);
    btn.classList.toggle('border-indigo-600', hasFilter);
    btn.classList.toggle('bg-white', !hasFilter);
    btn.classList.toggle('text-slate-600', !hasFilter);
    btn.classList.toggle('border-slate-200', !hasFilter);

    if (lbl) {
        if (!hasFilter) { lbl.textContent = 'Todas as vacinas'; return; }
        if (selSet.size === 1) {
            const vac = vaccines.find(v => String(v.id) === [...selSet][0]);
            lbl.textContent = vac ? vac.nome : '1 vacina';
        } else {
            lbl.textContent = `${selSet.size} vacinas`;
        }
    }
}

// ── Popover Vacina — Oferta ───────────────────────────────────────────────────

let _ofertaVacinaOutside = null;
let _ofertaVacinaAllVacs = [];

function openOfertaVacinaPopover(btn) {
    ['idade','genero','fidelidade'].forEach(t => _closeOfertaPop(t));
    closeTicketPopover();
    closeAprVacinaPopover();
    closeAprPrazoPopover();

    _ofertaVacinaAllVacs = vaccines.filter(v => v.ativo !== false).sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'));
    _openVacinaPopover({ popId:'ofe-vacina-popover', searchId:'ofe-vacina-search', listId:'ofe-vacina-list',
        allVacs: _ofertaVacinaAllVacs, filterFn: filterOfertaVacinaList, closeFn: closeOfertaVacinaPopover, anchorBtn: btn });

    if (_ofertaVacinaOutside) document.removeEventListener('click', _ofertaVacinaOutside);
    const pop = document.getElementById('ofe-vacina-popover');
    _ofertaVacinaOutside = (e) => {
        if (pop && !e.composedPath().includes(pop) && e.target !== btn) closeOfertaVacinaPopover();
        else setTimeout(() => document.addEventListener('click', _ofertaVacinaOutside, { once: true }), 10);
    };
    setTimeout(() => document.addEventListener('click', _ofertaVacinaOutside, { once: true }), 10);
}

function closeOfertaVacinaPopover() {
    const pop = document.getElementById('ofe-vacina-popover');
    if (pop) pop.classList.add('hidden');
    if (_ofertaVacinaOutside) { document.removeEventListener('click', _ofertaVacinaOutside); _ofertaVacinaOutside = null; }
    _updateOfertaVacinaBadge();
    renderOportunidades();
}

function filterOfertaVacinaList(val) {
    const clear = document.getElementById('ofe-vacina-search-clear');
    if (clear) clear.classList.toggle('hidden', !val);
    _renderVacinaList({ listId:'ofe-vacina-list', allVacs:_ofertaVacinaAllVacs,
        selSet:_oppFilter.oferta.vacinaIds, toggleFn:toggleOfertaVacina, searchVal:val });
}

function toggleOfertaVacina(id) {
    const sel = _oppFilter.oferta.vacinaIds;
    if (sel.has(id)) sel.delete(id); else sel.add(id);
    filterOfertaVacinaList(document.getElementById('ofe-vacina-search')?.value || '');
}

function clearOfertaVacinas() {
    _oppFilter.oferta.vacinaIds.clear();
    filterOfertaVacinaList(document.getElementById('ofe-vacina-search')?.value || '');
    _updateOfertaVacinaBadge();
    renderOportunidades();
}

function _updateOfertaVacinaBadge() {
    _updateVacinaBadge({ btnId:'ofe-vacina-btn', lblClass:'ofe-vacina-lbl', selSet:_oppFilter.oferta.vacinaIds });
}

// ── Popover Vacina — Aprazamento ──────────────────────────────────────────────

let _aprVacinaOutside = null;
let _aprVacinaAllVacs = [];

function openAprVacinaPopover(btn) {
    closeTicketPopover();
    closeAprPrazoPopover();

    _aprVacinaAllVacs = vaccines.filter(v => v.ativo !== false)
        .filter(v => appointments.some(a => a.vaccineId == v.id && a.status === 'Aplicado'))
        .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'));

    _openVacinaPopover({ popId:'apr-vacina-popover', searchId:'apr-vacina-search', listId:'apr-vacina-list',
        allVacs: _aprVacinaAllVacs, filterFn: filterAprVacinaList, closeFn: closeAprVacinaPopover, anchorBtn: btn });

    if (_aprVacinaOutside) document.removeEventListener('click', _aprVacinaOutside);
    const pop = document.getElementById('apr-vacina-popover');
    _aprVacinaOutside = (e) => {
        if (pop && !e.composedPath().includes(pop) && e.target !== btn) closeAprVacinaPopover();
        else setTimeout(() => document.addEventListener('click', _aprVacinaOutside, { once: true }), 10);
    };
    setTimeout(() => document.addEventListener('click', _aprVacinaOutside, { once: true }), 10);
}

function closeAprVacinaPopover() {
    const pop = document.getElementById('apr-vacina-popover');
    if (pop) pop.classList.add('hidden');
    if (_aprVacinaOutside) { document.removeEventListener('click', _aprVacinaOutside); _aprVacinaOutside = null; }
    _updateAprVacinaBadge();
    renderOportunidades();
}

function filterAprVacinaList(val) {
    const clear = document.getElementById('apr-vacina-search-clear');
    if (clear) clear.classList.toggle('hidden', !val);
    _renderVacinaList({ listId:'apr-vacina-list', allVacs:_aprVacinaAllVacs,
        selSet:_oppFilter.aprazamento.vacinaIds, toggleFn:toggleAprVacina, searchVal:val });
}

function toggleAprVacina(id) {
    const sel = _oppFilter.aprazamento.vacinaIds;
    if (sel.has(id)) sel.delete(id); else sel.add(id);
    filterAprVacinaList(document.getElementById('apr-vacina-search')?.value || '');
}

function clearAprVacinas() {
    _oppFilter.aprazamento.vacinaIds.clear();
    filterAprVacinaList(document.getElementById('apr-vacina-search')?.value || '');
    _updateAprVacinaBadge();
    renderOportunidades();
}

function _updateAprVacinaBadge() {
    _updateVacinaBadge({ btnId:'apr-vacina-btn', lblClass:'apr-vacina-lbl', selSet:_oppFilter.aprazamento.vacinaIds });
}

// ── Popover Prazo — Aprazamento ───────────────────────────────────────────────

let _aprPrazoOutside = null;

function openAprPrazoPopover(btn) {
    closeTicketPopover();
    closeAprVacinaPopover();

    const pop = document.getElementById('apr-prazo-popover');
    if (!pop) return;

    const diasEl = document.getElementById('apr-prazo-dias');
    if (diasEl) diasEl.value = _oppFilter.aprazamento.proxDias || 30;
    _renderAprPrazoSelection();

    const rect = btn.getBoundingClientRect();
    pop.style.top  = (rect.bottom + 8) + 'px';
    pop.style.left = '8px';
    pop.classList.remove('hidden');

    requestAnimationFrame(() => {
        const maxLeft = window.innerWidth - pop.offsetWidth - 8;
        pop.style.left = Math.max(8, Math.min(rect.left, maxLeft)) + 'px';
    });

    if (_aprPrazoOutside) document.removeEventListener('click', _aprPrazoOutside);
    _aprPrazoOutside = (e) => {
        if (!e.composedPath().includes(pop) && e.target !== btn) closeAprPrazoPopover();
        else setTimeout(() => document.addEventListener('click', _aprPrazoOutside, { once: true }), 10);
    };
    setTimeout(() => document.addEventListener('click', _aprPrazoOutside, { once: true }), 10);
}

function closeAprPrazoPopover() {
    const pop = document.getElementById('apr-prazo-popover');
    if (pop) pop.classList.add('hidden');
    if (_aprPrazoOutside) { document.removeEventListener('click', _aprPrazoOutside); _aprPrazoOutside = null; }
}

function _renderAprPrazoSelection() {
    const cur = _oppFilter.aprazamento.urgencia;
    const colorMap = { '':'slate', 'vencida':'red', 'proxima':'amber', 'futura':'green', 'sem_data':'slate' };
    document.querySelectorAll('.apr-prazo-opt').forEach(btn => {
        const val = btn.dataset.prazo;
        const active = val === cur;
        const color = colorMap[val] || 'slate';
        btn.classList.toggle(`border-${color}-400`, active);
        btn.classList.toggle(`bg-${color}-50`, active);
        btn.classList.toggle('border-slate-200', !active);
        btn.classList.toggle('bg-white', !active);
    });
}

function selectAprPrazo(val) {
    _oppFilter.aprazamento.urgencia = val;
    _renderAprPrazoSelection();
    _updateAprPrazoBadge();
    renderOportunidades();
}

function onAprPrazoDiasChange() {
    const val = parseInt(document.getElementById('apr-prazo-dias')?.value) || 30;
    _oppFilter.aprazamento.proxDias = Math.max(1, val);
    if (_oppFilter.aprazamento.urgencia === 'proxima') renderOportunidades();
}

function clearAprPrazo() {
    _oppFilter.aprazamento.urgencia = '';
    _oppFilter.aprazamento.proxDias = 30;
    const diasEl = document.getElementById('apr-prazo-dias');
    if (diasEl) diasEl.value = 30;
    _renderAprPrazoSelection();
    _updateAprPrazoBadge();
    closeAprPrazoPopover();
    renderOportunidades();
}

function _updateAprPrazoBadge() {
    const btn = document.getElementById('apr-prazo-btn');
    if (!btn) return;
    const f = _oppFilter.aprazamento;
    const lbl = btn.querySelector('.apr-prazo-lbl');
    const hasFilter = !!f.urgencia;

    const colorOn  = { vencida:'red', proxima:'amber', futura:'green', sem_data:'slate' };
    const c = colorOn[f.urgencia] || 'orange';

    btn.className = btn.className
        .replace(/\bbg-\S+\b/g,'').replace(/\bborder-\S+\b/g,'').replace(/\btext-\S+\b/g,'').trim();
    btn.classList.add('flex','items-center','gap-1.5','px-3','py-2','rounded-xl','border','font-black','text-xs','uppercase','tracking-wide','transition');

    if (hasFilter) {
        btn.classList.add(`bg-${c}-500`,'text-white',`border-${c}-500`,`hover:bg-${c}-600`);
    } else {
        btn.classList.add('bg-white','text-slate-600','border-slate-200','hover:bg-orange-50','hover:border-orange-300','hover:text-orange-600');
    }

    if (lbl) {
        const labels = { vencida:'Vencidas', proxima:`Próximas (${f.proxDias}d)`, futura:'Futuras', sem_data:'Sem data' };
        lbl.textContent = hasFilter ? (labels[f.urgencia] || 'Prazo') : 'Prazo';
    }
}

// ── Popovers de Oferta (Idade / Gênero / Fidelidade) ─────────────────────────

let _ofertaPopoverOutsideHandlers = {};

function openOfertaPopover(type, btn) {
    // Fecha todos os outros popovers
    ['idade','genero','fidelidade'].forEach(t => { if (t !== type) _closeOfertaPop(t); });
    closeTicketPopover();

    const pop = document.getElementById(`ofe-${type}-popover`);
    if (!pop) return;

    // Preenche valores atuais
    const f = _oppFilter.oferta;
    if (type === 'idade') {
        document.getElementById('ofe-idade-min-anos').value  = f.idadeMinAnos  || '';
        document.getElementById('ofe-idade-min-meses').value = f.idadeMinMeses || '';
        document.getElementById('ofe-idade-max-anos').value  = f.idadeMaxAnos  || '';
        document.getElementById('ofe-idade-max-meses').value = f.idadeMaxMeses || '';
    } else if (type === 'fidelidade') {
        document.getElementById('ofe-fid-min').value = f.fidMin || '';
        document.getElementById('ofe-fid-max').value = f.fidMax || '';
    } else if (type === 'genero') {
        _updateGeneroSelection(f.genero);
    }

    const rect = btn.getBoundingClientRect();
    pop.style.top  = (rect.bottom + 8) + 'px';
    pop.style.left = Math.max(8, rect.left - pop.offsetWidth + rect.width) + 'px';
    pop.classList.remove('hidden');

    // Aguarda render para calcular left correto
    requestAnimationFrame(() => {
        const maxLeft = window.innerWidth - pop.offsetWidth - 8;
        pop.style.left = Math.max(8, Math.min(rect.left - pop.offsetWidth + rect.width, maxLeft)) + 'px';
    });

    const handler = (e) => { if (!pop.contains(e.target)) _closeOfertaPop(type); };
    _ofertaPopoverOutsideHandlers[type] = handler;
    setTimeout(() => document.addEventListener('click', handler, { once: true }), 10);
}

function _closeOfertaPop(type) {
    const pop = document.getElementById(`ofe-${type}-popover`);
    if (pop) pop.classList.add('hidden');
}

function closeOfertaPopover(type) { _closeOfertaPop(type); }

function _updateGeneroSelection(val) {
    ['ambos','masculino','feminino'].forEach(g => {
        const btn = document.getElementById(`ofe-gen-${g}`);
        if (!btn) return;
        const active = val && val.toLowerCase() === g;
        btn.classList.toggle('border-pink-500', active);
        btn.classList.toggle('bg-pink-50', active);
        btn.classList.toggle('border-slate-200', !active);
    });
}

function applyOfertaFilter(type, value) {
    const f = _oppFilter.oferta;
    if (type === 'idade') {
        f.idadeMinAnos  = parseInt(document.getElementById('ofe-idade-min-anos').value)  || '';
        f.idadeMinMeses = parseInt(document.getElementById('ofe-idade-min-meses').value) || '';
        f.idadeMaxAnos  = parseInt(document.getElementById('ofe-idade-max-anos').value)  || '';
        f.idadeMaxMeses = parseInt(document.getElementById('ofe-idade-max-meses').value) || '';
        _closeOfertaPop('idade');
    } else if (type === 'genero') {
        f.genero = (value === f.genero) ? '' : value;
        if (f.genero === 'Ambos') f.genero = '';
        _updateGeneroSelection(f.genero);
        _closeOfertaPop('genero');
    } else if (type === 'fidelidade') {
        f.fidMin = parseInt(document.getElementById('ofe-fid-min').value) >= 0 ? parseInt(document.getElementById('ofe-fid-min').value) : '';
        f.fidMax = parseInt(document.getElementById('ofe-fid-max').value) >= 0 ? parseInt(document.getElementById('ofe-fid-max').value) : '';
        _closeOfertaPop('fidelidade');
    }
    _updateOfertaFilterBadges();
    renderOportunidades();
}

function clearOfertaFilter(type) {
    const f = _oppFilter.oferta;
    if (type === 'idade') {
        f.idadeMinAnos = f.idadeMinMeses = f.idadeMaxAnos = f.idadeMaxMeses = '';
        ['ofe-idade-min-anos','ofe-idade-min-meses','ofe-idade-max-anos','ofe-idade-max-meses'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        _closeOfertaPop('idade');
    } else if (type === 'genero') {
        f.genero = '';
        _updateGeneroSelection('');
        _closeOfertaPop('genero');
    } else if (type === 'fidelidade') {
        f.fidMin = f.fidMax = '';
        ['ofe-fid-min','ofe-fid-max'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        _closeOfertaPop('fidelidade');
    }
    _updateOfertaFilterBadges();
    renderOportunidades();
}

function _updateOfertaFilterBadges() {
    const f = _oppFilter.oferta;

    // Idade
    const idadeBtn = document.getElementById('ofe-idade-btn');
    if (idadeBtn) {
        const hasIdade = f.idadeMinAnos !== '' || f.idadeMinMeses !== '' || f.idadeMaxAnos !== '' || f.idadeMaxMeses !== '';
        idadeBtn.classList.toggle('bg-violet-600', hasIdade);
        idadeBtn.classList.toggle('text-white', hasIdade);
        idadeBtn.classList.toggle('border-violet-600', hasIdade);
        idadeBtn.classList.toggle('bg-white', !hasIdade);
        idadeBtn.classList.toggle('text-slate-600', !hasIdade);
        idadeBtn.classList.toggle('border-slate-200', !hasIdade);
        const lbl = idadeBtn.querySelector('.ofe-idade-lbl');
        if (lbl) {
            if (hasIdade) {
                const minStr = (f.idadeMinAnos !== '' || f.idadeMinMeses !== '')
                    ? `${f.idadeMinAnos||0}a ${f.idadeMinMeses||0}m` : '';
                const maxStr = (f.idadeMaxAnos !== '' || f.idadeMaxMeses !== '')
                    ? `${f.idadeMaxAnos||0}a ${f.idadeMaxMeses||0}m` : '';
                lbl.textContent = [minStr, maxStr].filter(Boolean).join(' – ') || 'Idade';
            } else { lbl.textContent = 'Idade'; }
        }
    }

    // Gênero
    const genBtn = document.getElementById('ofe-genero-btn');
    if (genBtn) {
        const hasGen = !!f.genero;
        const isMasc = f.genero === 'Masculino';
        genBtn.classList.toggle('bg-blue-500',  hasGen && isMasc);
        genBtn.classList.toggle('border-blue-500', hasGen && isMasc);
        genBtn.classList.toggle('hover:bg-blue-400', hasGen && isMasc);
        genBtn.classList.toggle('bg-pink-500',  hasGen && !isMasc);
        genBtn.classList.toggle('border-pink-500', hasGen && !isMasc);
        genBtn.classList.toggle('hover:bg-pink-400', hasGen && !isMasc);
        genBtn.classList.toggle('hover:bg-pink-50', !hasGen);
        genBtn.classList.toggle('hover:border-pink-300', !hasGen);
        genBtn.classList.toggle('hover:text-pink-600', !hasGen);
        genBtn.classList.toggle('text-white', hasGen);
        genBtn.classList.toggle('bg-white', !hasGen);
        genBtn.classList.toggle('text-slate-600', !hasGen);
        genBtn.classList.toggle('border-slate-200', !hasGen);
        const lbl = genBtn.querySelector('.ofe-genero-lbl');
        if (lbl) lbl.textContent = f.genero || 'Gênero';
    }

    // Fidelidade
    const fidBtn = document.getElementById('ofe-fidelidade-btn');
    if (fidBtn) {
        const hasFid = f.fidMin !== '' || f.fidMax !== '';
        fidBtn.classList.toggle('bg-amber-500', hasFid);
        fidBtn.classList.toggle('text-white', hasFid);
        fidBtn.classList.toggle('border-amber-500', hasFid);
        fidBtn.classList.toggle('bg-white', !hasFid);
        fidBtn.classList.toggle('text-slate-600', !hasFid);
        fidBtn.classList.toggle('border-slate-200', !hasFid);
        const lbl = fidBtn.querySelector('.ofe-fidelidade-lbl');
        if (lbl) {
            if (hasFid) {
                const min = f.fidMin !== '' ? `${f.fidMin}` : '';
                const max = f.fidMax !== '' ? `${f.fidMax}` : '';
                lbl.textContent = [min, max].filter(Boolean).join(' – ') + ' doses';
            } else { lbl.textContent = 'Fidelidade'; }
        }
    }
}

// ── Aplica filtros de paciente na renderOferta ────────────────────────────────

function _applyOfertaPatientFilters(groups) {
    const f = _oppFilter.oferta;

    return groups.filter(pg => {
        const p = pg.patient;

        // Gênero
        if (f.genero) {
            const pGen = (p.genero || '').toLowerCase();
            if (pGen !== f.genero.toLowerCase()) return false;
        }

        // Fidelidade (doses aplicadas)
        if (f.fidMin !== '' || f.fidMax !== '') {
            const doses = _appliedCount(p.id);
            if (f.fidMin !== '' && doses < f.fidMin) return false;
            if (f.fidMax !== '' && doses > f.fidMax) return false;
        }

        // Faixa etária
        if (f.idadeMinAnos !== '' || f.idadeMinMeses !== '' || f.idadeMaxAnos !== '' || f.idadeMaxMeses !== '') {
            if (!p.dtNasc) return false;
            const ai = getAgeInMonths(p.dtNasc);
            const totalMeses = ai.years * 12 + ai.months;
            const minT = (parseInt(f.idadeMinAnos) || 0) * 12 + (parseInt(f.idadeMinMeses) || 0);
            const hasMax = f.idadeMaxAnos !== '' || f.idadeMaxMeses !== '';
            const maxT = hasMax ? ((parseInt(f.idadeMaxAnos) || 0) * 12 + (parseInt(f.idadeMaxMeses) || 0)) : Infinity;
            if (totalMeses < minT || totalMeses > maxT) return false;
        }

        return true;
    });
}
