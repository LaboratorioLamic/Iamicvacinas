// ─── DASHBOARD RENDERING (from index.html lines ~2502-3131) ──────────────────

function getAppsByPeriodo() {
    const periodo = document.getElementById('dash-periodo').value;
    let apps = appointments;
    if (periodo === 'ano') {
        const ano = document.getElementById('dash-ano-base').value;
        if (ano) apps = apps.filter(a => a.data && a.data.startsWith(ano));
    } else if (periodo === 'mes') {
        const mes = document.getElementById('dash-filter-mes').value;
        if (mes) apps = apps.filter(a => a.data && a.data.startsWith(mes));
    } else if (periodo === 'personalizado') {
        const inicio = document.getElementById('dash-data-inicio').value;
        const fim = document.getElementById('dash-data-fim').value;
        if (inicio) apps = apps.filter(a => a.data >= inicio);
        if (fim) apps = apps.filter(a => a.data <= fim);
    }
    return apps;
}

function renderDashboard() {
    populateDashDropdowns();

    const filterVacina = document.getElementById('dash-filter-vacina').value;
    const filterColab = document.getElementById('dash-filter-colaborador').value;

    let apps = getAppsByPeriodo();

    if (filterVacina) apps = apps.filter(a => String(a.vaccineId) === filterVacina);
    if (filterColab) apps = apps.filter(a => a.vendedor === filterColab);

    if (dashView === 'analitico') {
        renderDashAnalitico(apps);
    } else {
        renderDashFinanceiro(apps);
    }
}

function sortRankTable(containerId, key) {
    const s = rankSortState[containerId] || { key: 'count', dir: -1 };
    if (s.key === key) { s.dir = -s.dir; }
    else { s.key = key; s.dir = key === 'label' ? 1 : -1; }
    rankSortState[containerId] = s;
    renderRankingTable(containerId);
}

function buildRankingTable(containerId, items, cols, accentColor) {
    rankData[containerId] = { items, cols, accentColor };
    if (!rankSortState[containerId]) rankSortState[containerId] = { key: 'count', dir: -1 };
    renderRankingTable(containerId);
}

function renderRankingTable(containerId) {
    const { items, cols, accentColor } = rankData[containerId];
    const state  = rankSortState[containerId];
    const color1 = accentColor || '#10b981';
    const el = document.getElementById(containerId);
    if (!el) return;
    const _dark = document.body.classList.contains('dark-mode');

    if (!items.length) {
        el.innerHTML = '<p class="text-slate-400 text-xs text-center py-8 font-bold">Sem dados no período selecionado</p>';
        return;
    }

    // Ordena os itens
    const sorted = [...items].sort((a, b) => {
        const av = a[state.key] ?? 0, bv = b[state.key] ?? 0;
        if (typeof av === 'string') return state.dir * av.localeCompare(bv, 'pt-BR');
        return state.dir * (bv - av);
    });

    // Chave de proporção: segue o campo numérico atualmente ordenado
    const propKey   = (state.key === 'count' || state.key === 'valor') ? state.key : 'count';
    const maxProp   = Math.max(...sorted.map(i => i[propKey] || 0));
    const totalProp = sorted.reduce((s, i) => s + (i[propKey] || 0), 0);

    const sortIcon = (colKey) => {
        if (!colKey) return '';
        if (state.key !== colKey) return '<i class="fas fa-sort text-slate-300 ml-1 text-[8px]"></i>';
        return state.dir === -1
            ? '<i class="fas fa-sort-down text-clinic-500 ml-1 text-[8px]"></i>'
            : '<i class="fas fa-sort-up text-clinic-500 ml-1 text-[8px]"></i>';
    };
    const thSort = (colKey) => colKey
        ? `class="text-[10px] font-black text-slate-400 uppercase text-left pb-2 px-2 cursor-pointer select-none hover:text-clinic-600 transition-colors whitespace-nowrap" onclick="sortRankTable('${containerId}','${colKey}')"`
        : `class="text-[10px] font-black text-slate-400 uppercase text-left pb-2 px-2"`;

    const rowBorder = _dark ? '#1e293b' : '#f8fafc';
    const rowHover  = _dark ? '#1e293b' : '#f8fafc';
    const cellColor = _dark ? '#f1f5f9' : '#172554';
    const barBg     = _dark ? '#334155' : '#e2e8f0';

    let html = `<table class="w-full">
        <thead>
            <tr style="border-bottom:2px solid ${_dark?'#334155':'#e2e8f0'}">
                <th class="text-[10px] font-black text-slate-400 uppercase text-left pb-2 pr-2 w-5">#</th>
                ${cols.map(c => `<th ${thSort(c.sortKey)}>${c.label}${sortIcon(c.sortKey)}</th>`).join('')}
                <th ${thSort(propKey)}>PROPORÇÃO${sortIcon(propKey)}</th>
            </tr>
        </thead><tbody>`;

    sorted.forEach((item, idx) => {
        const propVal = item[propKey] || 0;
        const pct    = maxProp > 0 ? (propVal / maxProp * 100) : 0;
        const absPct = totalProp > 0 ? (propVal / totalProp * 100).toFixed(1) : '0.0';
        const barClr = idx === 0 ? color1 : '#93c5fd';
        html += `<tr style="border-bottom:1px solid ${rowBorder}" onmouseover="this.style.background='${rowHover}'" onmouseout="this.style.background=''">
            <td class="py-2.5 pr-2 text-[11px] font-black text-slate-400">${idx + 1}</td>
            ${cols.map(c => `<td class="py-2.5 px-2 text-[11px] font-black whitespace-nowrap" style="color:${cellColor}">${c.get(item)}</td>`).join('')}
            <td class="py-2.5 pl-2">
                <div class="flex items-center gap-2">
                    <div class="flex-1 rounded-full overflow-hidden" style="height:8px;min-width:50px;background:${barBg}">
                        <div style="width:${pct}%;height:8px;background:${barClr};border-radius:9999px;transition:width .4s;"></div>
                    </div>
                    <span class="text-[10px] font-black text-slate-500 w-9 text-right shrink-0">${absPct}%</span>
                </div>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    el.innerHTML = html;
}

function renderDashAnalitico(apps) {
    const total = apps.length;
    const applied = apps.filter(a => a.status === 'Aplicado').length;
    const cancelled = apps.filter(a => a.status === 'Perdido').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const delayed = apps.filter(a => a.data < todayStr && a.status === 'Agendado').length;

    document.getElementById('kpi-total').innerText = total;
    document.getElementById('kpi-aplicados').innerText = applied;
    document.getElementById('kpi-cancelados').innerText = cancelled;
    document.getElementById('kpi-atrasados').innerText = delayed;

    // ── Pipeline Funil ──
    const _dark = document.body.classList.contains('dark-mode');
    const negCount = apps.filter(a => ['Em negociação','Agendado','Aplicado'].includes(a.status)).length;
    const agdCount = apps.filter(a => ['Agendado','Aplicado'].includes(a.status)).length;
    const aplCount = apps.filter(a => a.status === 'Aplicado').length;
    const allCount = apps.length;

    const funnelStages = [
        { label: 'Novas Oportunidades', count: allCount,  color: '#6366f1', pct: null },
        { label: 'Em Negociação',       count: negCount,  color: '#3b82f6', pct: allCount > 0 ? (negCount/allCount*100).toFixed(0) : 0 },
        { label: 'Agendado',            count: agdCount,  color: '#06b6d4', pct: negCount > 0 ? (agdCount/negCount*100).toFixed(0) : 0 },
        { label: 'Aplicado',            count: aplCount,  color: '#10b981', pct: agdCount > 0 ? (aplCount/agdCount*100).toFixed(0) : 0 },
    ];

    const maxW = 100;
    const minW = 40;
    const funnelEl = document.getElementById('pipeline-funil');
    if (funnelEl) {
        const textColor = _dark ? '#94a3b8' : '#64748b';
        const convColor = _dark ? '#cbd5e1' : '#475569';
        let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:0;width:100%;">`;
        funnelStages.forEach((s, i) => {
            const w = allCount > 0 ? Math.max(minW, Math.round(minW + (maxW - minW) * (s.count / allCount))) : maxW;
            html += `
            <div style="display:flex;flex-direction:column;align-items:center;width:100%;">
                ${i > 0 && s.pct !== null ? `<div style="display:flex;align-items:center;gap:6px;margin:2px 0;">
                    <div style="height:1px;width:28px;background:${_dark?'#334155':'#e2e8f0'};"></div>
                    <span style="font-size:10px;font-weight:900;color:${convColor};white-space:nowrap;">↓ ${s.pct}% conversão</span>
                    <div style="height:1px;width:28px;background:${_dark?'#334155':'#e2e8f0'};"></div>
                </div>` : ''}
                <div style="width:${w}%;background:${s.color};border-radius:8px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;transition:width .4s;margin-bottom:0;">
                    <span style="font-size:10px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;">${s.label}</span>
                    <span style="font-size:14px;font-weight:900;color:#fff;margin-left:8px;">${s.count}</span>
                </div>
            </div>`;
        });
        html += `</div>`;
        funnelEl.innerHTML = html;
    }

    // ── Ranking: vacinas mais aplicadas ──
    const vacMap = {};
    apps.filter(a => a.status === 'Aplicado').forEach(a => {
        const v = vaccines.find(x=>x.id==a.vaccineId);
        if(v) vacMap[v.nome] = (vacMap[v.nome]||0) + 1;
    });
    const vacItems = Object.entries(vacMap).sort((a,b)=>b[1]-a[1]).slice(0,10)
        .map(([nome, count]) => ({ label: nome, count }));
    buildRankingTable('rank-vac-analitico', vacItems, [
        { label: 'Vacina',      get: i => i.label, sortKey: 'label' },
        { label: 'Aplicações', get: i => i.count, sortKey: 'count' }
    ], '#10b981');

    // ── Ranking: Venda por Colaborador (analítico) ──
    const analVendMap = {};
    apps.filter(a => a.vendedor).forEach(a => {
        analVendMap[a.vendedor] = (analVendMap[a.vendedor] || 0) + 1;
    });
    const analVendItems = Object.entries(analVendMap).sort((a,b)=>b[1]-a[1]).slice(0,10)
        .map(([nome, count]) => ({ label: nome, count }));
    buildRankingTable('rank-anal-vendedor', analVendItems, [
        { label: 'Colaborador', get: i => i.label, sortKey: 'label' },
        { label: 'Volume',      get: i => i.count, sortKey: 'count' }
    ], '#3b82f6');

    // ── Ranking: Aplicação por Colaborador (analítico) ──
    const analAplMap = {};
    apps.filter(a => a.status === 'Aplicado' && a.aplicador).forEach(a => {
        analAplMap[a.aplicador] = (analAplMap[a.aplicador] || 0) + 1;
    });
    const analAplItems = Object.entries(analAplMap).sort((a,b)=>b[1]-a[1]).slice(0,10)
        .map(([nome, count]) => ({ label: nome, count }));
    buildRankingTable('rank-anal-aplicador', analAplItems, [
        { label: 'Colaborador', get: i => i.label, sortKey: 'label' },
        { label: 'Aplicações', get: i => i.count, sortKey: 'count' }
    ], '#10b981');

    // ── Ranking: Motivo de Perda (analítico) ──
    const analMotMap = {};
    apps.filter(a => a.status === 'Perdido').forEach(a => {
        const m = (a.motivoCancelamento || '').trim() || 'Não informado';
        analMotMap[m] = (analMotMap[m] || 0) + 1;
    });
    const analMotItems = Object.entries(analMotMap).sort((a,b)=>b[1]-a[1]).slice(0,10)
        .map(([nome, count]) => ({ label: nome, count }));
    buildRankingTable('rank-anal-motivo', analMotItems, [
        { label: 'Motivo',      get: i => i.label, sortKey: 'label' },
        { label: 'Ocorrências', get: i => i.count, sortKey: 'count' }
    ], '#ef4444');

    // ── Linha: evolução mensal por vacina ──
    const lineStatusFilter = document.getElementById('dash-line-status').value;
    const doAgrupar  = document.getElementById('dash-line-agrupar').dataset.on === '1';
    const doAnoAtual = document.getElementById('dash-line-ano-atual').dataset.on === '1';
    const LINE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];

    let appsLine = lineStatusFilter ? apps.filter(a => a.status === lineStatusFilter) : apps;

    // Determina o ano de referência para o botão "Ano Atual"
    const periodo = document.getElementById('dash-periodo').value;
    const anoRef = (periodo === 'ano')
        ? (document.getElementById('dash-ano-base').value || new Date().getFullYear())
        : new Date().getFullYear();

    // Monta o intervalo de 12 meses
    let monthRange = [];
    if (doAnoAtual) {
        // 12 meses fixos do ano de referência (Jan–Dez)
        for (let m = 1; m <= 12; m++) {
            monthRange.push(`${anoRef}-${String(m).padStart(2,'0')}`);
        }
        // Filtra os dados ao mesmo ano
        appsLine = appsLine.filter(a => a.data && a.data.startsWith(String(anoRef)));
    } else {
        // Últimos 12 meses a partir do mês mais recente nos dados
        const allMonths = [...new Set(appsLine.filter(a=>a.data).map(a=>a.data.slice(0,7)))].sort();
        if (allMonths.length) {
            const lastMonth = allMonths[allMonths.length-1];
            const [ly, lm] = lastMonth.split('-').map(Number);
            for (let i = 11; i >= 0; i--) {
                const d = new Date(ly, lm-1-i, 1);
                monthRange.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
            }
        } else {
            const now = new Date();
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
                monthRange.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
            }
        }
    }

    const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const monthLabels = monthRange.map(ym => {
        const [y,m] = ym.split('-');
        return MONTH_NAMES[parseInt(m)-1]+'/'+y.slice(2);
    });

    let lineDatasets = [];

    if (doAgrupar) {
        // Linha única: soma de todas as vacinas por mês
        const data = monthRange.map(ym => appsLine.filter(a => a.data && a.data.startsWith(ym)).length);
        lineDatasets = [{ label: 'Total', data, borderColor: '#3b82f6', backgroundColor: '#3b82f622', fill: true, tension: 0.3, pointRadius: 4, borderWidth: 2.5 }];
    } else {
        // Top 5 vacinas separadas
        const vacTotals = {};
        appsLine.forEach(a => {
            const v = vaccines.find(x=>x.id==a.vaccineId);
            if(v) vacTotals[v.nome] = (vacTotals[v.nome]||0) + 1;
        });
        const topVacs = Object.entries(vacTotals).sort((a,b)=>b[1]-a[1]).slice(0,5).map(e=>e[0]);
        lineDatasets = topVacs.map((nome, idx) => {
            const data = monthRange.map(ym =>
                appsLine.filter(a => a.data && a.data.startsWith(ym) && vaccines.find(x=>x.id==a.vaccineId)?.nome === nome).length
            );
            return { label: nome, data, borderColor: LINE_COLORS[idx], backgroundColor: LINE_COLORS[idx]+'22', fill: false, tension: 0.3, pointRadius: 4, borderWidth: 2 };
        });
    }

    if (!lineDatasets.length || lineDatasets.every(ds => ds.data.every(v=>v===0))) {
        lineDatasets = [{ label: 'Sem dados', data: monthRange.map(()=>0), borderColor:'#cbd5e1', backgroundColor:'#f1f5f922', fill:true, tension:0.3, pointRadius:3 }];
    }

    const ctxLine = document.getElementById('lineVaccineChart').getContext('2d');
    if(chartLineVaccine) chartLineVaccine.destroy();
    chartLineVaccine = new Chart(ctxLine, {
        type: 'line',
        data: { labels: monthLabels, datasets: lineDatasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: { legend: { position: 'bottom', labels: { font:{size:10}, padding:10 } } }
        }
    });

    // ── Barras: Faixa Etária (pacientes únicos dos agendamentos filtrados) ──
    const today = new Date();
    const ageBuckets = {'0-1':0,'2-5':0,'6-9':0,'10-19':0,'20-29':0,'30-39':0,'40-49':0,'50-59':0,'60-69':0,'70-79':0,'80+':0};
    const seenPacAge = new Set();
    apps.forEach(a => {
        if (seenPacAge.has(a.patientId)) return;
        const pac = patients.find(x => x.id == a.patientId);
        if (!pac || !pac.dtNasc) return;
        seenPacAge.add(a.patientId);
        const birth = new Date(pac.dtNasc + 'T00:00:00');
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        if (age <= 1) ageBuckets['0-1']++;
        else if (age <= 5) ageBuckets['2-5']++;
        else if (age <= 9) ageBuckets['6-9']++;
        else if (age < 20) ageBuckets['10-19']++;
        else if (age < 30) ageBuckets['20-29']++;
        else if (age < 40) ageBuckets['30-39']++;
        else if (age < 50) ageBuckets['40-49']++;
        else if (age < 60) ageBuckets['50-59']++;
        else if (age < 70) ageBuckets['60-69']++;
        else if (age < 80) ageBuckets['70-79']++;
        else ageBuckets['80+']++;
    });
    const ctxAge = document.getElementById('ageChart').getContext('2d');
    if (chartAge) chartAge.destroy();
    chartAge = new Chart(ctxAge, {
        type: 'bar',
        data: {
            labels: Object.keys(ageBuckets),
            datasets: [{ label: 'Pacientes', data: Object.values(ageBuckets), backgroundColor: '#3b82f6', borderRadius: 6, borderSkipped: false }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw} paciente${ctx.raw !== 1 ? 's' : ''}` } } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } }
        }
    });

    // ── Donut: Gênero (pacientes únicos dos agendamentos filtrados) ──
    const genderCounts = { 'Masculino': 0, 'Feminino': 0, 'Não informado': 0 };
    const seenPacGen = new Set();
    apps.forEach(a => {
        if (seenPacGen.has(a.patientId)) return;
        const pac = patients.find(x => x.id == a.patientId);
        if (!pac) return;
        seenPacGen.add(a.patientId);
        const g = pac.genero || '';
        if (g === 'Masculino') genderCounts['Masculino']++;
        else if (g === 'Feminino') genderCounts['Feminino']++;
        else genderCounts['Não informado']++;
    });
    const genderTotal = Object.values(genderCounts).reduce((s, v) => s + v, 0);
    const ctxGender = document.getElementById('genderChart').getContext('2d');
    if (chartGender) chartGender.destroy();
    chartGender = new Chart(ctxGender, {
        type: 'doughnut',
        data: {
            labels: Object.keys(genderCounts),
            datasets: [{ data: Object.values(genderCounts), backgroundColor: ['#3b82f6', '#ec4899', '#94a3b8'], borderWidth: 2, borderColor: _dark ? 'transparent' : '#fff' }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { font: { size: 10 }, padding: 12, color: _dark ? '#94a3b8' : '#64748b' } },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const val = ctx.raw;
                            const pct = genderTotal > 0 ? ((val / genderTotal) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}: ${val} (${pct}%)`;
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'genderPctLabel',
            afterDraw(chart) {
                if (genderTotal === 0) return;
                const { ctx: c } = chart;
                chart.data.datasets[0].data.forEach((val, i) => {
                    if (!val) return;
                    const meta = chart.getDatasetMeta(0);
                    const arc = meta.data[i];
                    const { x, y } = arc.tooltipPosition();
                    const pct = ((val / genderTotal) * 100).toFixed(0) + '%';
                    c.save();
                    c.font = 'bold 10px sans-serif';
                    c.fillStyle = '#fff';
                    c.textAlign = 'center';
                    c.textBaseline = 'middle';
                    if (val / genderTotal > 0.05) c.fillText(pct, x, y);
                    c.restore();
                });
            }
        }]
    });
}

function renderDashFinanceiro(apps) {
    const fmt = fmtBRL;
    const toVal    = a => parseFloat(String(a.valorAplicado || '0').replace(',','.')) || 0;
    const toCheio  = a => a.valorCheio ? (parseFloat(String(a.valorCheio).replace(',','.')) || toVal(a)) : toVal(a);

    const aplicados   = apps.filter(a => a.status === 'Aplicado');
    const pendentes   = apps.filter(a => a.status === 'Agendado' || a.status === 'Em negociação');
    const cancelados  = apps.filter(a => a.status === 'Perdido');

    const receitaReal  = aplicados.reduce((s,a) => s + toVal(a), 0);
    const receitaPrev  = pendentes.reduce((s,a) => s + toVal(a), 0);
    const receitaCanc  = cancelados.reduce((s,a) => s + toVal(a), 0);
    const ticketMedio  = aplicados.length ? receitaReal / aplicados.length : 0;

    // KPIs de desconto — baseados em todos os agendamentos com desconto aplicado
    const comDesconto      = apps.filter(a => a.valorCheio && a.descontoPct > 0);
    const receitaEsperada  = apps.reduce((s,a) => s + toCheio(a), 0);
    const descontoTotal    = receitaEsperada - apps.reduce((s,a) => s + toVal(a), 0);
    const mediaDesconto    = comDesconto.length
        ? comDesconto.reduce((s,a) => s + (a.descontoPct || 0), 0) / comDesconto.length
        : 0;
    const ticketEsperado   = aplicados.length
        ? aplicados.reduce((s,a) => s + toCheio(a), 0) / aplicados.length
        : 0;

    document.getElementById('kpi-fin-esperada').innerText        = fmt(receitaEsperada);
    document.getElementById('kpi-fin-realizada').innerText       = fmt(receitaReal);
    document.getElementById('kpi-fin-realizada-qtd').innerText   = `${aplicados.length} aplicação(ões)`;
    document.getElementById('kpi-fin-desconto-total').innerText  = fmt(descontoTotal < 0 ? 0 : descontoTotal);
    document.getElementById('kpi-fin-desconto-qtd').innerText    = `${comDesconto.length} com desconto`;
    document.getElementById('kpi-fin-desconto-medio').innerText  = mediaDesconto.toFixed(1).replace('.',',') + '%';
    document.getElementById('kpi-fin-prevista').innerText        = fmt(receitaPrev);
    document.getElementById('kpi-fin-prevista-qtd').innerText    = `${pendentes.length} agendamento(s)`;
    document.getElementById('kpi-fin-cancelado').innerText       = fmt(receitaCanc);
    document.getElementById('kpi-fin-cancelado-qtd').innerText   = `${cancelados.length} perda(s)`;
    document.getElementById('kpi-fin-ticket').innerText          = fmt(ticketMedio);
    document.getElementById('kpi-fin-ticket-esperado').innerText = fmt(ticketEsperado);

    // Receita por Vacina
    const ctxFV = document.getElementById('finVaccineChart').getContext('2d');
    const finVacMap = {};
    aplicados.forEach(a => {
        const v = vaccines.find(x=>x.id==a.vaccineId);
        const nome = v ? v.nome : 'Desconhecida';
        finVacMap[nome] = (finVacMap[nome]||0) + toVal(a);
    });
    const fvEntries = Object.entries(finVacMap).sort((a,b) => b[1]-a[1]).slice(0,8);
    const fvLabels  = fvEntries.map(e=>e[0]);
    const fvData    = fvEntries.map(e=>e[1]);

    if(chartFinVaccine) chartFinVaccine.destroy();
    chartFinVaccine = new Chart(ctxFV, {
        type: 'bar',
        data: { labels: fvLabels.length ? fvLabels : ['Nenhuma'], datasets: [{ label:'Receita (R$)', data: fvData.length?fvData:[0], backgroundColor: '#10b981' }] },
        options: { responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { callback: v => 'R$ '+v.toLocaleString('pt-BR') } } },
            plugins: { tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } } }
        }
    });

    // Evolução Mensal
    const ctxFM = document.getElementById('finMonthChart').getContext('2d');
    const monthMap = {};
    aplicados.forEach(a => {
        if(!a.data) return;
        const ym = a.data.slice(0,7);
        monthMap[ym] = (monthMap[ym]||0) + toVal(a);
    });
    const sortedMonths = Object.keys(monthMap).sort();
    const fmLabels = sortedMonths.map(ym => {
        const [y,m] = ym.split('-');
        return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(m)-1]+'/'+y.slice(2);
    });
    const fmData = sortedMonths.map(ym => monthMap[ym]);

    if(chartFinMonth) chartFinMonth.destroy();
    chartFinMonth = new Chart(ctxFM, {
        type: 'line',
        data: { labels: fmLabels.length ? fmLabels : ['—'], datasets: [{ label:'Receita (R$)', data: fmData.length?fmData:[0], borderColor:'#7c3aed', backgroundColor:'rgba(124,58,237,0.1)', fill:true, tension:0.3, pointRadius:4 }] },
        options: { responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { callback: v => 'R$ '+v.toLocaleString('pt-BR') } } },
            plugins: { tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } } }
        }
    });

    // ── Ranking: Venda por Colaborador (vendedor) ──
    const vendMap = {};
    apps.filter(a => a.vendedor).forEach(a => {
        if (!vendMap[a.vendedor]) vendMap[a.vendedor] = { count: 0, valor: 0 };
        vendMap[a.vendedor].count++;
        vendMap[a.vendedor].valor += toVal(a);
    });
    const vendItems = Object.entries(vendMap).sort((a,b)=>b[1].valor-a[1].valor).slice(0,10)
        .map(([nome,d]) => ({ label: nome, count: d.count, valor: d.valor }));
    buildRankingTable('rank-fin-vendedor', vendItems, [
        { label: 'Colaborador',  get: i => i.label,        sortKey: 'label' },
        { label: 'Volume',       get: i => i.count,        sortKey: 'count' },
        { label: 'Valor Total',  get: i => fmtBRL(i.valor), sortKey: 'valor' }
    ], '#3b82f6');

    // ── Ranking: Aplicação por Colaborador (aplicador) ──
    const aplMap = {};
    aplicados.filter(a => a.aplicador).forEach(a => {
        if (!aplMap[a.aplicador]) aplMap[a.aplicador] = { count: 0, valor: 0 };
        aplMap[a.aplicador].count++;
        aplMap[a.aplicador].valor += toVal(a);
    });
    const aplItems = Object.entries(aplMap).sort((a,b)=>b[1].count-a[1].count).slice(0,10)
        .map(([nome,d]) => ({ label: nome, count: d.count, valor: d.valor }));
    buildRankingTable('rank-fin-aplicador', aplItems, [
        { label: 'Colaborador',  get: i => i.label,        sortKey: 'label' },
        { label: 'Aplicações',   get: i => i.count,        sortKey: 'count' },
        { label: 'Valor Total',  get: i => fmtBRL(i.valor), sortKey: 'valor' }
    ], '#10b981');

    // ── Ranking: Vacinas mais aplicadas (financeiro) ──
    const finVacRankMap = {};
    aplicados.forEach(a => {
        const v = vaccines.find(x=>x.id==a.vaccineId);
        const nome = v ? v.nome : 'Desconhecida';
        if (!finVacRankMap[nome]) finVacRankMap[nome] = { count: 0, valor: 0 };
        finVacRankMap[nome].count++;
        finVacRankMap[nome].valor += toVal(a);
    });
    const finVacItems = Object.entries(finVacRankMap).sort((a,b)=>b[1].valor-a[1].valor).slice(0,10)
        .map(([nome,d]) => ({ label: nome, count: d.count, valor: d.valor }));
    buildRankingTable('rank-fin-vacinas', finVacItems, [
        { label: 'Vacina',   get: i => i.label,        sortKey: 'label' },
        { label: 'Doses',    get: i => i.count,        sortKey: 'count' },
        { label: 'Receita', get: i => fmtBRL(i.valor), sortKey: 'valor' }
    ], '#8b5cf6');

    // ── Ranking: Motivo de Perda ──
    const motivoMap = {};
    cancelados.forEach(a => {
        const m = (a.motivoCancelamento || '').trim() || 'Não informado';
        if (!motivoMap[m]) motivoMap[m] = { count: 0, valor: 0 };
        motivoMap[m].count++;
        motivoMap[m].valor += toVal(a);
    });
    const motivoItems = Object.entries(motivoMap).sort((a,b)=>b[1].count-a[1].count).slice(0,10)
        .map(([nome,d]) => ({ label: nome, count: d.count, valor: d.valor }));
    buildRankingTable('rank-fin-motivo', motivoItems, [
        { label: 'Motivo',        get: i => i.label,        sortKey: 'label' },
        { label: 'Ocorrências',   get: i => i.count,        sortKey: 'count' },
        { label: 'Valor Perdido', get: i => fmtBRL(i.valor), sortKey: 'valor' }
    ], '#ef4444');
}
