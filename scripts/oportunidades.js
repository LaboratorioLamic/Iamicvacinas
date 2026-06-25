// ─── OPORTUNIDADES DE VENDA ────────────────────────────────────────────────────

function calcOportunidades() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);

    const byPatient = {};

    patients.forEach(patient => {
        const patApps = appointments.filter(a => a.patientId === patient.id);
        const appliedApps = patApps.filter(a => a.status === 'Aplicado');
        if (!appliedApps.length) return;

        const scheduledApps = patApps.filter(a => a.status === 'Agendado');

        // Group applied by vaccine
        const byVac = {};
        appliedApps.forEach(a => {
            if (!byVac[a.vaccineId]) byVac[a.vaccineId] = [];
            byVac[a.vaccineId].push(a);
        });

        const opps = [];

        Object.keys(byVac).forEach(vacId => {
            const vac = vaccines.find(v => v.id == vacId);
            if (!vac || vac.ativo === false) return;

            const applied = byVac[vacId];
            const scheduled = scheduledApps.filter(a => a.vaccineId == vacId);

            const esq = getEsquemaPaciente(vac, patient.dtNasc);
            const numDoses = esq ? (esq.numDoses || 1) : (vac.numDoses || 1);

            // ── Case 1: próxima dose em esquema multi-dose ──
            if (numDoses > 1) {
                const appliedNums = applied
                    .filter(a => a.doseAtual && /^\d+ª Dose$/.test(a.doseAtual))
                    .map(a => parseInt(a.doseAtual));

                if (appliedNums.length) {
                    const maxApplied = Math.max(...appliedNums);
                    if (maxApplied < numDoses) {
                        const nextDoseStr = `${maxApplied + 1}ª Dose`;
                        const alreadyScheduled = scheduled.some(a => a.doseAtual === nextDoseStr);
                        if (!alreadyScheduled) {
                            const lastBase = applied
                                .filter(a => a.doseAtual === `${maxApplied}ª Dose`)
                                .sort((a, b) => new Date(b.data) - new Date(a.data))[0];

                            let suggestedDate = null;
                            if (lastBase) {
                                const intervalos = (esq && esq.intervalos && esq.intervalos.length)
                                    ? esq.intervalos
                                    : (vac.intervalos && vac.intervalos.length ? vac.intervalos
                                        : (vac.intervaloDias > 0 ? [vac.intervaloDias] : []));
                                let intervalo = intervalos.length
                                    ? (intervalos[maxApplied - 1] != null ? intervalos[maxApplied - 1] : intervalos[intervalos.length - 1])
                                    : 30;
                                if (!intervalo || intervalo <= 0) intervalo = 30;
                                const d = new Date(lastBase.data + 'T00:00:00');
                                d.setDate(d.getDate() + intervalo);
                                suggestedDate = d;
                            }

                            opps.push({
                                type: 'proxima_dose',
                                vaccine: vac,
                                dose: nextDoseStr,
                                suggestedDate,
                                revenue: parseBRL(String(vac.valor || '0')) || 0,
                                urgency: _urgency(suggestedDate, today, in30)
                            });
                        }
                    }
                }
            }

            // ── Case 2: dose única repetível ──
            const repeatingScheme = vac.esquemas && vac.esquemas.find(e =>
                e.numDoses === 1 && e.repete && e.repeteMeses > 0
            );
            if (repeatingScheme) {
                const lastDU = applied
                    .filter(a => a.doseAtual === 'Dose Única')
                    .sort((a, b) => new Date(b.data) - new Date(a.data))[0];

                if (lastDU) {
                    const alreadyScheduled = scheduled.some(a =>
                        a.doseAtual === 'Dose Única' && new Date(a.data + 'T00:00:00') >= today
                    );
                    if (!alreadyScheduled) {
                        const nextDate = new Date(lastDU.data + 'T00:00:00');
                        nextDate.setMonth(nextDate.getMonth() + repeatingScheme.repeteMeses);
                        opps.push({
                            type: 'dose_unica_repetivel',
                            vaccine: vac,
                            dose: 'Dose Única',
                            suggestedDate: nextDate,
                            revenue: parseBRL(String(vac.valor || '0')) || 0,
                            urgency: _urgency(nextDate, today, in30)
                        });
                    }
                }
            }

            // ── Case 3: reforço pendente ──
            if (vac.reforco) {
                const hasReforco = applied.some(a => a.doseAtual === 'Reforço');
                const scheduledReforco = scheduled.some(a => a.doseAtual === 'Reforço');
                if (!hasReforco && !scheduledReforco) {
                    const completedScheme = numDoses === 1
                        ? applied.some(a => a.doseAtual === 'Dose Única' || a.doseAtual === '1ª Dose')
                        : applied.some(a => a.doseAtual === `${numDoses}ª Dose`);

                    if (completedScheme) {
                        const lastApp = applied.sort((a, b) => new Date(b.data) - new Date(a.data))[0];
                        let suggestedDate = null;
                        if (lastApp) {
                            const intervalos = (esq && esq.intervalos && esq.intervalos.length) ? esq.intervalos : [];
                            const intervalo = intervalos[numDoses] || vac.intervaloDias || 365;
                            const d = new Date(lastApp.data + 'T00:00:00');
                            d.setDate(d.getDate() + intervalo);
                            suggestedDate = d;
                        }
                        opps.push({
                            type: 'reforco',
                            vaccine: vac,
                            dose: 'Reforço',
                            suggestedDate,
                            revenue: parseBRL(String(vac.valor || '0')) || 0,
                            urgency: _urgency(suggestedDate, today, in30)
                        });
                    }
                }
            }
        });

        if (opps.length) {
            if (!byPatient[patient.id]) byPatient[patient.id] = { patient, opps: [] };
            byPatient[patient.id].opps.push(...opps);
        }
    });

    return Object.values(byPatient);
}

function _urgency(date, today, in30) {
    if (!date) return 'sem_data';
    if (date < today) return 'vencida';
    if (date <= in30) return 'proxima';
    return 'futura';
}

function _urgencyLabel(u) {
    return {
        vencida: 'Vencida',
        proxima: 'Próxima',
        futura: 'Futura',
        sem_data: 'Sem data'
    }[u] || u;
}

function _urgencyClasses(u) {
    return {
        vencida: 'bg-red-100 text-red-700 border-red-200',
        proxima: 'bg-amber-100 text-amber-700 border-amber-200',
        futura: 'bg-green-100 text-green-700 border-green-200',
        sem_data: 'bg-slate-100 text-slate-500 border-slate-200'
    }[u] || 'bg-slate-100 text-slate-500 border-slate-200';
}

function _typeIcon(type) {
    return {
        proxima_dose: 'fa-syringe',
        dose_unica_repetivel: 'fa-redo-alt',
        reforco: 'fa-shield-virus'
    }[type] || 'fa-syringe';
}

let _oppFilter = { search: '', vacina: '', urgencia: '' };

function renderOportunidades() {
    const container = document.getElementById('oport-cards-container');
    const emptyEl   = document.getElementById('oport-empty');
    const statsEl   = document.getElementById('oport-stats');
    if (!container) return;

    const all = calcOportunidades();

    // Apply filters
    const search  = normalizeStr(_oppFilter.search || '');
    const vacFilt = _oppFilter.vacina;
    const urgFilt = _oppFilter.urgencia;

    let filtered = all.map(pg => {
        let opps = pg.opps;
        if (vacFilt) opps = opps.filter(o => String(o.vaccine.id) === String(vacFilt));
        if (urgFilt) opps = opps.filter(o => o.urgency === urgFilt);
        return { ...pg, opps };
    }).filter(pg => {
        if (!pg.opps.length) return false;
        if (search) {
            const p = pg.patient;
            return normalizeStr(p.nome).includes(search) || normalizeStr(p.cpf || '').includes(search);
        }
        return true;
    });

    // Sort: most urgent first (vencida > proxima > futura > sem_data), then by revenue desc
    const urgOrder = { vencida: 0, proxima: 1, futura: 2, sem_data: 3 };
    filtered.forEach(pg => {
        pg.opps.sort((a, b) => (urgOrder[a.urgency] ?? 9) - (urgOrder[b.urgency] ?? 9));
    });
    filtered.sort((a, b) => {
        const aUrgMin = Math.min(...a.opps.map(o => urgOrder[o.urgency] ?? 9));
        const bUrgMin = Math.min(...b.opps.map(o => urgOrder[o.urgency] ?? 9));
        if (aUrgMin !== bUrgMin) return aUrgMin - bUrgMin;
        const aRev = a.opps.reduce((s, o) => s + o.revenue, 0);
        const bRev = b.opps.reduce((s, o) => s + o.revenue, 0);
        return bRev - aRev;
    });

    // Stats
    const totalOpps = filtered.reduce((s, pg) => s + pg.opps.length, 0);
    const totalRev  = filtered.reduce((s, pg) => s + pg.opps.reduce((ss, o) => ss + o.revenue, 0), 0);
    const totalVenc = filtered.reduce((s, pg) => s + pg.opps.filter(o => o.urgency === 'vencida').length, 0);
    const totalProx = filtered.reduce((s, pg) => s + pg.opps.filter(o => o.urgency === 'proxima').length, 0);

    if (statsEl) {
        statsEl.innerHTML = `
            <div class="flex flex-wrap gap-3 items-center">
                <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                    <i class="fas fa-users text-indigo-500 text-sm"></i>
                    <span class="font-black text-navy-900">${filtered.length}</span>
                    <span class="text-xs text-slate-500 uppercase tracking-wide">Pacientes</span>
                </div>
                <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                    <i class="fas fa-bullseye text-clinic-500 text-sm"></i>
                    <span class="font-black text-navy-900">${totalOpps}</span>
                    <span class="text-xs text-slate-500 uppercase tracking-wide">Oportunidades</span>
                </div>
                <div class="flex items-center gap-2 bg-white border border-emerald-200 rounded-xl px-4 py-2 shadow-sm bg-emerald-50">
                    <i class="fas fa-dollar-sign text-emerald-600 text-sm"></i>
                    <span class="font-black text-emerald-700">${formatCurrency(totalRev)}</span>
                    <span class="text-xs text-emerald-600 uppercase tracking-wide">Receita potencial</span>
                </div>
                ${totalVenc > 0 ? `<div class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2 shadow-sm"><i class="fas fa-exclamation-circle text-red-500 text-sm"></i><span class="font-black text-red-700">${totalVenc}</span><span class="text-xs text-red-600 uppercase tracking-wide">Vencidas</span></div>` : ''}
                ${totalProx > 0 ? `<div class="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 shadow-sm"><i class="fas fa-clock text-amber-500 text-sm"></i><span class="font-black text-amber-700">${totalProx}</span><span class="text-xs text-amber-600 uppercase tracking-wide">Próx. 30 dias</span></div>` : ''}
            </div>`;
    }

    if (!filtered.length) {
        container.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    container.innerHTML = filtered.map(pg => _renderPatientOppCard(pg)).join('');
}

function _renderPatientOppCard({ patient, opps }) {
    const totalRev = opps.reduce((s, o) => s + o.revenue, 0);
    const hasVenc  = opps.some(o => o.urgency === 'vencida');
    const hasProx  = opps.some(o => o.urgency === 'proxima');

    const borderCls = hasVenc ? 'border-red-300' : hasProx ? 'border-amber-300' : 'border-slate-200';
    const topBg     = hasVenc ? 'from-red-50 to-white' : hasProx ? 'from-amber-50 to-white' : 'from-slate-50 to-white';

    const age = patient.dtNasc ? getAgeDisplay(patient.dtNasc) : '';
    const phone = patient.contato ? formatPhone(patient.contato) : '';
    const waNumber = patient.contato ? ('55' + patient.contato.replace(/\D/g, '')) : '';
    const waHref = waNumber ? `https://wa.me/${waNumber}` : '';

    const microCards = opps.map(o => _renderMicroCard(patient, o)).join('');

    return `
    <div class="bg-white rounded-2xl shadow-sm border ${borderCls} overflow-hidden transition hover:shadow-md">
        <div class="px-5 py-4 bg-gradient-to-r ${topBg} border-b border-slate-100 flex flex-wrap justify-between items-start gap-3">
            <div class="flex items-center gap-3 min-w-0">
                <div class="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 font-black text-sm">
                    ${(patient.nome || '?')[0].toUpperCase()}
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-2">
                        <p class="font-black text-navy-900 text-sm truncate">${patient.nome || '—'}</p>
                        ${waHref ? `<a href="${waHref}" target="_blank" rel="noopener" title="Abrir WhatsApp" class="shrink-0 h-6 w-6 rounded-lg bg-green-100 hover:bg-green-500 text-green-600 hover:text-white flex items-center justify-center transition"><i class="fab fa-whatsapp text-[11px]"></i></a>` : ''}
                    </div>
                    <p class="text-[11px] text-slate-500 truncate">${patient.cpf || ''}${age ? ` · ${age}` : ''}${phone ? ` · ${phone}` : ''}</p>
                </div>
            </div>
            <div class="flex items-center gap-3 shrink-0">
                <div class="text-right">
                    <div class="text-[10px] text-slate-400 uppercase tracking-wide">Potencial</div>
                    <div class="font-black text-emerald-600 text-sm">${formatCurrency(totalRev)}</div>
                </div>
                <div class="text-right">
                    <div class="text-[10px] text-slate-400 uppercase tracking-wide">Oport.</div>
                    <div class="font-black text-indigo-600 text-sm">${opps.length}</div>
                </div>
            </div>
        </div>
        <div class="p-4 flex flex-wrap gap-2">
            ${microCards}
        </div>
    </div>`;
}

function _renderMicroCard(patient, opp) {
    const urg    = opp.urgency;
    const urgCls = _urgencyClasses(urg);
    const icon   = _typeIcon(opp.type);
    const dateStr = opp.suggestedDate
        ? opp.suggestedDate.toISOString().split('T')[0].split('-').reverse().join('/')
        : '—';
    const isoDate = opp.suggestedDate
        ? opp.suggestedDate.toISOString().split('T')[0]
        : '';

    const daysLabel = opp.suggestedDate ? (() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const diff = Math.round((opp.suggestedDate - today) / 86400000);
        if (diff < 0) return `<span class="text-red-500">${Math.abs(diff)}d atraso</span>`;
        if (diff === 0) return `<span class="text-amber-600">Hoje</span>`;
        return `<span class="text-slate-400">em ${diff}d</span>`;
    })() : '';

    return `
    <div class="flex flex-col gap-1.5 bg-slate-50 border ${urgCls.split(' ').find(c=>c.startsWith('border-'))} rounded-xl px-3 py-2.5 min-w-[160px] max-w-[220px] flex-1">
        <div class="flex items-center gap-1.5">
            <i class="fas ${icon} text-indigo-500 text-[10px]"></i>
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
        <button
            onclick="agendarOportunidade(${patient.id}, ${opp.vaccine.id}, '${opp.dose.replace(/'/g,"\\'")}', '${isoDate}')"
            class="mt-0.5 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wide py-1.5 rounded-lg transition shadow-sm">
            <i class="fas fa-calendar-plus mr-1"></i>Agendar
        </button>
    </div>`;
}

function agendarOportunidade(patId, vacId, dose, dataIso) {
    closeModals();
    openRecordModal();

    setTimeout(() => {
        const p = patients.find(x => x.id == patId);
        if (!p) return;

        // Fill patient
        const psEl = document.getElementById('reg-patient-search');
        psEl.value = `${p.cpf} - ${p.nome}`;
        psEl.setCustomValidity('');
        psEl.classList.remove('border-red-400');
        psEl.classList.add('border-slate-200');
        document.getElementById('hidden-patient-id').value = p.id;
        document.getElementById('reg-cpf').value = p.cpf;
        document.getElementById('reg-dtnasc').value = p.dtNasc;
        document.getElementById('reg-idade').value = getAgeDisplay(p.dtNasc);
        document.getElementById('reg-contato').value = formatPhone(p.contato);
        if (p.responsavel) {
            document.getElementById('div-responsavel').style.display = 'block';
            document.getElementById('div-responsavel-placeholder').style.display = 'none';
            document.getElementById('reg-responsavel').value = p.responsavel;
        }
        _enableVaccineFields();

        // Fill vaccine
        const vac = vaccines.find(x => x.id == vacId);
        document.getElementById('reg-vacina').value = vacId;
        document.getElementById('reg-vacina-search').value = vac ? vac.nome : '';
        autoFillVaccine();

        setTimeout(() => {
            document.getElementById('reg-dose').value = dose;
            if (dataIso) document.getElementById('reg-data').value = dataIso;
            updateSuggestedDate();
        }, 80);
    }, 120);
}

function oppFilterSearch(val) {
    _oppFilter.search = val;
    renderOportunidades();
}

function oppFilterVacina(val) {
    _oppFilter.vacina = val;
    renderOportunidades();
}

function oppFilterUrgencia(val) {
    _oppFilter.urgencia = val;
    renderOportunidades();
}

function populateOppVacinaFilter() {
    const sel = document.getElementById('oport-filter-vacina');
    if (!sel) return;
    const usedIds = new Set(appointments.filter(a => a.status === 'Aplicado').map(a => a.vaccineId));
    const used = vaccines.filter(v => usedIds.has(v.id) && v.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    sel.innerHTML = '<option value="">Todas as vacinas</option>' +
        used.map(v => `<option value="${v.id}">${v.nome}</option>`).join('');
}
