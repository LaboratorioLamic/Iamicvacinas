// ─── ABA "ROTINA" DO PRONTUÁRIO — aprazamento vacinal por vacina/dose ──────────
//
// Mostra, por vacina, um card por dose (aplicada, agendada ou apenas prevista),
// coloridos por status:
//   Verde   = Aplicada aqui (com data)
//   Azul    = Próxima dose / agendamento futuro (fora da janela de 30 dias)
//   Amarelo = A vencer (até 30 dias, aplicada ou não)
//   Laranja = Atrasada
//   Vermelho= Cancelada (agendamento perdido, sem ser "outro local")
//   Roxo    = Aplicada em outro local (registrada como tal, ou dose > 1 sem
//             que as doses anteriores estejam no sistema — esquema iniciado
//             fora da clínica mesmo sem registro explícito)

const ROTINA_STATUS_STYLE = {
    aplicada:   { bar: 'bg-green-500',  bg: 'bg-green-50/60',  border: 'border-green-200 hover:border-green-400',  text: 'text-green-700',  icon: 'fa-check',                dot: 'bg-green-500'  },
    proxima:    { bar: 'bg-blue-500',   bg: 'bg-blue-50/60',   border: 'border-blue-200 hover:border-blue-400',    text: 'text-blue-700',   icon: 'fa-calendar-alt',         dot: 'bg-blue-500'   },
    a_vencer:   { bar: 'bg-amber-500',  bg: 'bg-amber-50/60',  border: 'border-amber-200 hover:border-amber-400',  text: 'text-amber-700',  icon: 'fa-hourglass-half',       dot: 'bg-amber-500'  },
    atrasada:   { bar: 'bg-orange-500', bg: 'bg-orange-50/60', border: 'border-orange-200 hover:border-orange-400',text: 'text-orange-700', icon: 'fa-triangle-exclamation', dot: 'bg-orange-500' },
    cancelada:  { bar: 'bg-red-500',    bg: 'bg-red-50/60',    border: 'border-red-200 hover:border-red-400',      text: 'text-red-700',    icon: 'fa-ban',                   dot: 'bg-red-500'    },
    outro_local:{ bar: 'bg-violet-500', bg: 'bg-violet-50/60', border: 'border-violet-200 hover:border-violet-400',text: 'text-violet-700', icon: 'fa-map-marker-alt',       dot: 'bg-violet-500' }
};

const ROTINA_STATUS_LABEL = {
    aplicada: 'Aplicada', proxima: 'Próxima dose', a_vencer: 'A vencer', atrasada: 'Atrasada',
    cancelada: 'Cancelada', outro_local: 'Outro local'
};

function _rotinaTodayISO() { return new Date().toISOString().split('T')[0]; }

function _rotinaDoseOrdinal(doseStr) {
    if (!doseStr) return null;
    const m = /^(\d+)ª Dose$/.exec(doseStr);
    if (m) return parseInt(m[1]);
    if (doseStr === 'Dose Única') return 1;
    if (doseStr === 'Dose Zero') return 0;
    return null; // 'Reforço' tratado à parte
}

// Classifica uma data (string YYYY-MM-DD) frente à janela de 30 dias.
function _rotinaDateBucket(dateStr) {
    const today = _rotinaTodayISO();
    const in30 = new Date(); in30.setHours(0,0,0,0); in30.setDate(in30.getDate() + 30);
    const in30Str = in30.toISOString().split('T')[0];
    if (dateStr < today) return 'atrasada';
    if (dateStr <= in30Str) return 'a_vencer';
    return 'proxima';
}

function _rotinaFmtDate(dateStr) {
    return dateStr ? dateStr.split('-').reverse().join('/') : '—';
}

// Monta as "linhas" (uma por dose/marco) de uma vacina para o paciente, a
// partir dos appointments existentes + a próxima dose prevista (se houver).
function _rotinaBuildVaccineRow(vac, patient, apps) {
    const cards = [];

    // Doses numeradas + Dose Única + Dose Zero, na ordem em que ocorreram/estão previstas.
    const numbered = apps
        .filter(a => _rotinaDoseOrdinal(a.doseAtual) !== null)
        .sort((a, b) => _rotinaDoseOrdinal(a.doseAtual) - _rotinaDoseOrdinal(b.doseAtual) || new Date(a.data) - new Date(b.data));

    // Agrupa por número de dose (pode haver mais de um registro pra mesma dose: ex. cancelado + reagendado)
    const byOrdinal = new Map();
    numbered.forEach(a => {
        const n = _rotinaDoseOrdinal(a.doseAtual);
        if (!byOrdinal.has(n)) byOrdinal.set(n, []);
        byOrdinal.get(n).push(a);
    });

    let maxAppliedOrdinal = -1;
    let lastAppliedApp = null;

    Array.from(byOrdinal.keys()).sort((a, b) => a - b).forEach(ordinal => {
        const regs = byOrdinal.get(ordinal);
        // Prioriza o registro "vivo" mais relevante: Aplicado > Agendado/Em negociação/Nova oportunidade > Perdido
        const applied = regs.find(a => a.status === 'Aplicado');
        const outroLocalReg = regs.find(a => a.status === 'Perdido' && a.aplicadaOutroLocal);
        const pending = regs.filter(a => a.status === 'Agendado' || a.status === 'Em negociação' || a.status === 'Nova oportunidade')
            .sort((a, b) => new Date(a.data) - new Date(b.data))[0];
        const cancelled = regs.find(a => a.status === 'Perdido' && !a.aplicadaOutroLocal);

        const reg = applied || outroLocalReg || pending || cancelled;
        if (!reg) return;

        // Roxo: marcado como outro local, OU aplicada mas é dose > 1 sem a dose anterior
        // registrada no sistema (esquema iniciado fora da clínica sem registro explícito).
        const missingPrevDose = applied && ordinal > 1 && !_rotinaHasAppliedBelow(byOrdinal, ordinal, patient, apps);

        let status;
        if (outroLocalReg && !applied) {
            status = 'outro_local';
        } else if (applied) {
            status = (missingPrevDose) ? 'outro_local' : 'aplicada';
            maxAppliedOrdinal = ordinal;
            lastAppliedApp = applied;
        } else if (cancelled && !pending) {
            status = 'cancelada';
        } else if (pending) {
            status = _rotinaDateBucket(pending.data);
        } else {
            status = 'cancelada';
        }

        cards.push({
            label: reg.doseAtual,
            date: (applied || outroLocalReg) ? (applied || outroLocalReg).data : (pending ? pending.data : (cancelled ? cancelled.data : null)),
            status,
            appointmentId: reg.id,
            hasAppointment: true
        });
    });

    // Reforço (se aplicável) — mesmo tratamento
    if (vac.reforco) {
        const reforcoRegs = apps.filter(a => a.doseAtual === 'Reforço');
        if (reforcoRegs.length) {
            const applied = reforcoRegs.find(a => a.status === 'Aplicado');
            const outroLocalReg = reforcoRegs.find(a => a.status === 'Perdido' && a.aplicadaOutroLocal);
            const pending = reforcoRegs.filter(a => a.status === 'Agendado' || a.status === 'Em negociação' || a.status === 'Nova oportunidade')
                .sort((a, b) => new Date(a.data) - new Date(b.data))[0];
            const cancelled = reforcoRegs.find(a => a.status === 'Perdido' && !a.aplicadaOutroLocal);
            const reg = applied || outroLocalReg || pending || cancelled;
            let status;
            if (outroLocalReg && !applied) status = 'outro_local';
            else if (applied) { status = 'aplicada'; lastAppliedApp = applied; }
            else if (cancelled && !pending) status = 'cancelada';
            else if (pending) status = _rotinaDateBucket(pending.data);
            else status = 'cancelada';

            cards.push({
                label: 'Reforço',
                date: (applied || outroLocalReg) ? (applied || outroLocalReg).data : (pending ? pending.data : (cancelled ? cancelled.data : null)),
                status,
                appointmentId: reg.id,
                hasAppointment: true
            });
        }
    }

    // Próxima dose prevista (sem registro ainda) — card azul/amarelo/laranja "fantasma", clicável p/ agendar.
    const next = _rotinaNextDoseSuggestion(vac, patient, apps, maxAppliedOrdinal, lastAppliedApp);
    if (next) cards.push(next);

    return cards;
}

function _rotinaHasAppliedBelow(byOrdinal, ordinal, patient, apps) {
    // Considera "registrada" tanto uma dose aplicada aqui quanto uma marcada como outro local.
    for (let n = 1; n < ordinal; n++) {
        const regs = byOrdinal.get(n) || [];
        if (regs.some(a => a.status === 'Aplicado' || (a.status === 'Perdido' && a.aplicadaOutroLocal))) continue;
        return false;
    }
    return true;
}

// Calcula a próxima dose/reforço ainda sem nenhum registro no sistema.
function _rotinaNextDoseSuggestion(vac, patient, apps, maxAppliedOrdinal, lastAppliedApp) {
    if (maxAppliedOrdinal < 0 || !lastAppliedApp) return null;

    const esq = (typeof getEsquemaPaciente === 'function') ? getEsquemaPaciente(vac, patient.dtNasc) : null;
    const totalDoses = (vac.esquemas && vac.esquemas.length)
        ? Math.max(...vac.esquemas.map(e => e.numDoses || 1))
        : (esq ? (esq.numDoses || 1) : (vac.numDoses || 1));

    // Já existe registro (mesmo que só previsto) para a próxima dose numerada? _rotinaBuildVaccineRow já cobre isso.
    const nextOrdinal = maxAppliedOrdinal + 1;
    const alreadyHasNext = apps.some(a => _rotinaDoseOrdinal(a.doseAtual) === nextOrdinal);

    if (!alreadyHasNext && nextOrdinal <= totalDoses && totalDoses > 1) {
        const intervalos = (esq && esq.intervalos && esq.intervalos.length) ? esq.intervalos
            : (vac.intervalos && vac.intervalos.length ? vac.intervalos
                : (vac.intervaloDias > 0 ? [vac.intervaloDias] : []));
        let intervalo = intervalos.length
            ? (intervalos[maxAppliedOrdinal - 1] != null ? intervalos[maxAppliedOrdinal - 1] : intervalos[intervalos.length - 1])
            : 30;
        if (!intervalo || intervalo <= 0) intervalo = 30;
        const baseDate = new Date(lastAppliedApp.data + 'T00:00:00');
        const calcDate = new Date(baseDate); calcDate.setDate(calcDate.getDate() + intervalo);
        const dateStr = calcDate.toISOString().split('T')[0];
        return {
            label: `${nextOrdinal}ª Dose`,
            date: dateStr,
            status: _rotinaDateBucket(dateStr),
            appointmentId: null,
            hasAppointment: false,
            suggestedDose: `${nextOrdinal}ª Dose`
        };
    }

    // Reforço previsto (esquema completo, vacina prevê reforço, ainda sem registro)
    if (vac.reforco) {
        const hasReforcoReg = apps.some(a => a.doseAtual === 'Reforço');
        const completed = totalDoses === 1
            ? apps.some(a => (a.doseAtual === 'Dose Única' || a.doseAtual === '1ª Dose') && (a.status === 'Aplicado' || (a.status === 'Perdido' && a.aplicadaOutroLocal)))
            : maxAppliedOrdinal >= totalDoses;
        if (!hasReforcoReg && completed) {
            const d = new Date(lastAppliedApp.data + 'T00:00:00');
            if (vac.reforcoMeses > 0) d.setMonth(d.getMonth() + vac.reforcoMeses);
            else {
                const intervalos = (esq && esq.intervalos && esq.intervalos.length) ? esq.intervalos : [];
                const intervalo = intervalos[totalDoses] || vac.intervaloDias || 365;
                d.setDate(d.getDate() + intervalo);
            }
            const dateStr = d.toISOString().split('T')[0];
            return {
                label: 'Reforço',
                date: dateStr,
                status: _rotinaDateBucket(dateStr),
                appointmentId: null,
                hasAppointment: false,
                suggestedDose: 'Reforço'
            };
        }
    }

    return null;
}

function _rotinaCardHtml(vac, patient, card) {
    const style = ROTINA_STATUS_STYLE[card.status] || ROTINA_STATUS_STYLE.proxima;
    const label = ROTINA_STATUS_LABEL[card.status] || card.status;
    const dateLine = card.date ? `Aplicada em ${_rotinaFmtDate(card.date)}` : 'Sem data';
    const dateLineOther = {
        proxima: card.date ? `Prevista para ${_rotinaFmtDate(card.date)}` : 'Data a definir',
        a_vencer: card.date ? `Prevista para ${_rotinaFmtDate(card.date)}` : 'Data a definir',
        atrasada: card.date ? `Prevista para ${_rotinaFmtDate(card.date)}` : 'Data a definir',
        cancelada: card.date ? `Cancelada • ${_rotinaFmtDate(card.date)}` : 'Cancelada',
        outro_local: card.date ? `Aplicada em ${_rotinaFmtDate(card.date)}` : 'Aplicada em outro local'
    };
    const line = card.status === 'aplicada' ? dateLine : (dateLineOther[card.status] || dateLine);

    const onclick = card.hasAppointment
        ? `viewRecord(${card.appointmentId})`
        : `rotinaAgendarSugestao(${patient.id}, ${vac.id}, '${card.suggestedDose}', '${card.date}')`;

    const actionLabel = card.hasAppointment ? 'Ver detalhes' : 'Agendar';
    const actionIcon = card.hasAppointment ? 'fa-arrow-right' : 'fa-calendar-plus';

    return `
    <button onclick="${onclick}" class="rotina-card relative w-36 shrink-0 text-left ${style.bg} border ${style.border} rounded-xl shadow-sm hover:shadow-md transition overflow-hidden group">
        <div class="h-1 w-full ${style.bar}"></div>
        <div class="p-3">
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-black text-navy-900">${card.label}</span>
                <span class="h-5 w-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 ${style.text}"><i class="fas ${style.icon} text-[9px]"></i></span>
            </div>
            <p class="text-[9px] font-black uppercase tracking-wider ${style.text} mb-1">${label}</p>
            <p class="text-[10px] text-slate-500 font-bold leading-tight">${line}</p>
            <p class="mt-2 text-[9px] font-black uppercase tracking-wider ${style.text} opacity-0 group-hover:opacity-100 transition flex items-center gap-1">${actionLabel} <i class="fas ${actionIcon} text-[8px]"></i></p>
        </div>
    </button>`;
}

function renderRotinaTab(patientId) {
    const wrap = document.getElementById('rotina-list');
    if (!wrap) return;
    const patient = patients.find(p => p.id == patientId);
    if (!patient) { wrap.innerHTML = ''; return; }

    const apps = appointments.filter(a => a.patientId == patientId);
    if (!apps.length) {
        wrap.innerHTML = '<div class="text-center py-10"><i class="fas fa-syringe text-4xl text-slate-200 mb-3"></i><p class="text-sm text-slate-400 font-bold uppercase">Nenhuma vacina registrada</p></div>';
        return;
    }

    const vacIds = Array.from(new Set(apps.map(a => a.vaccineId)));
    const rows = vacIds
        .map(vacId => vaccines.find(v => v.id == vacId))
        .filter(Boolean)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map(vac => {
            const vacApps = apps.filter(a => a.vaccineId == vac.id);
            const cards = _rotinaBuildVaccineRow(vac, patient, vacApps);
            if (!cards.length) return '';
            return `
            <div class="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                <h5 class="text-xs font-black text-navy-900 uppercase tracking-wide mb-2.5">${vac.nome}</h5>
                <div class="flex gap-3 overflow-x-auto pb-1">${cards.map(c => _rotinaCardHtml(vac, patient, c)).join('')}</div>
            </div>`;
        })
        .join('');

    wrap.innerHTML = rows || '<div class="text-center py-10"><i class="fas fa-syringe text-4xl text-slate-200 mb-3"></i><p class="text-sm text-slate-400 font-bold uppercase">Nenhuma vacina registrada</p></div>';
}

// Abre o formulário de agendamento pré-preenchido com a dose sugerida, por
// cima do prontuário (mesmo padrão de openAgendarFromProntuario).
function rotinaAgendarSugestao(patId, vacId, dose, dataIso) {
    if (!checkPerm('criar_agendamento')) return;
    window._agendaOpenedFromProntuario = true;
    if (typeof agendarOportunidade === 'function') {
        agendarOportunidade(patId, vacId, dose, dataIso);
        setTimeout(() => { document.getElementById('modal-record').style.zIndex = '130'; }, 0);
    }
}
