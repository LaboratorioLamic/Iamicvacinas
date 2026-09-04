// ─── UI / NAVIGATION FUNCTIONS ───────────────────────────────────────────────

// ── Modo Leve ────────────────────────────────────────────────────────────────
function toggleLiteMode() {
    const isActive = document.body.classList.toggle('lite-mode');
    const btn = document.getElementById('lite-mode-toggle');
    btn.classList.toggle('active', isActive);
    try { localStorage.setItem('lite-mode', isActive ? '1' : '0'); } catch(e) {}
}

function initLiteMode() {
    try {
        if (localStorage.getItem('lite-mode') === '1') {
            document.body.classList.add('lite-mode');
            const btn = document.getElementById('lite-mode-toggle');
            if (btn) btn.classList.add('active');
        }
    } catch(e) {}
}

document.addEventListener('DOMContentLoaded', initLiteMode);

// ── Modo Escuro ───────────────────────────────────────────────────────────────
function toggleDarkMode() {
    const isActive = document.body.classList.toggle('dark-mode');
    const btn = document.getElementById('dark-mode-toggle');
    if (btn) btn.classList.toggle('active', isActive);
    try { localStorage.setItem('dark-mode', isActive ? '1' : '0'); } catch(e) {}
    _applyDarkModeInlineColors(isActive);
    if (typeof refreshAlmoxIfActive === 'function') refreshAlmoxIfActive();
}

function initDarkMode() {
    try {
        if (localStorage.getItem('dark-mode') === '1') {
            document.body.classList.add('dark-mode');
            const btn = document.getElementById('dark-mode-toggle');
            if (btn) btn.classList.add('active');
            _applyDarkModeInlineColors(true);
        }
    } catch(e) {}
}

// Substitui inline bg colors que CSS puro não alcança (Tailwind JIT arbitrary values)
function _applyDarkModeInlineColors(on) {
    const lightBgMap = {
        '#eef2f7': '#0f172a',
        '#f1f5f9': '#0f172a',
        'rgb(238, 242, 247)': '#0f172a',
        'rgb(241, 245, 249)': '#0f172a',
    };
    const lightBorderMap = {
        '#bfdbfe': 'rgba(59,130,246,0.3)',
        '#a5f3fc': 'rgba(6,182,212,0.3)',
        '#bbf7d0': 'rgba(16,185,129,0.3)',
        '#fecdd3': 'rgba(239,68,68,0.3)',
        '#ddd6fe': 'rgba(139,92,246,0.3)',
        '#fde68a': 'rgba(245,158,11,0.3)',
    };
    // Status badge backgrounds (inline style)
    const statusBgMap = {
        '#eff6ff': 'rgba(59,130,246,0.12)',
        '#ecfeff': 'rgba(6,182,212,0.12)',
        '#f0fdf4': 'rgba(16,185,129,0.12)',
        '#fff1f2': 'rgba(239,68,68,0.12)',
        '#f8fafc': 'rgba(100,116,139,0.12)',
        '#fffbeb': 'rgba(245,158,11,0.12)',
        '#faf5ff': 'rgba(139,92,246,0.12)',
    };
    if (!on) {
        // restore: re-render triggered by switchTab / renderDashboard etc will fix inline styles
        return;
    }
    // Apply overrides to elements with inline background styles
    document.querySelectorAll('[style]').forEach(el => {
        if (el.closest('#login-screen')) return;
        const bg = el.style.backgroundColor || el.style.background;
        if (!bg) return;
        for (const [light, dark] of Object.entries({...lightBgMap, ...statusBgMap})) {
            if (bg === light || bg.replace(/\s/g,'') === light.replace(/\s/g,'')) {
                el.dataset.dmOrigBg = bg;
                el.style.backgroundColor = dark;
                return;
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', initDarkMode);
// ─────────────────────────────────────────────────────────────────────────────

let _dangerCallback = null;

function showConfirmDanger(msg, onConfirm) {
    _dangerCallback = onConfirm;
    document.getElementById('modal-danger-msg').textContent = msg;
    const modal = document.getElementById('modal-danger-confirm');
    modal.classList.remove('hidden');
    const btn = document.getElementById('modal-danger-btn-confirm');
    btn.onclick = () => { const cb = _dangerCallback; closeDangerConfirm(); if (cb) cb(); };
}

function closeDangerConfirm() {
    document.getElementById('modal-danger-confirm').classList.add('hidden');
    _dangerCallback = null;
}

let _neutralCallback = null;

function showConfirmNeutral(msg, onConfirm, opts) {
    _neutralCallback = onConfirm;
    document.getElementById('modal-neutral-msg').textContent = msg;
    document.getElementById('modal-neutral-title').textContent = (opts && opts.title) || 'Confirmar';
    const btn = document.getElementById('modal-neutral-btn-confirm');
    btn.innerHTML = `<i class="fas ${(opts && opts.icon) || 'fa-check'} mr-1.5"></i>${(opts && opts.confirmLabel) || 'Confirmar'}`;
    document.getElementById('modal-neutral-confirm').classList.remove('hidden');
    btn.onclick = () => { const cb = _neutralCallback; closeNeutralConfirm(); if (cb) cb(); };
}

function closeNeutralConfirm() {
    document.getElementById('modal-neutral-confirm').classList.add('hidden');
    _neutralCallback = null;
}

function showDuplicatePatientBlock(msg, info, existingId) {
    document.getElementById('modal-patient-duplicate-msg').textContent = msg;
    document.getElementById('modal-patient-duplicate-info').textContent = info;
    const btnView = document.getElementById('modal-patient-duplicate-btn-view');
    btnView.onclick = () => { closeDuplicatePatientModal(); closeModals(); viewPatientHistory(existingId); };
    document.getElementById('modal-patient-duplicate').classList.remove('hidden');
}

function closeDuplicatePatientModal() {
    document.getElementById('modal-patient-duplicate').classList.add('hidden');
}

let agendaView = 'kanban'; // 'agenda' | 'planilha' | 'kanban' | 'oportunidades'

function switchAgendaView(view) {
    agendaView = view;
    const isTabela = view === 'planilha' || view === 'kanban';
    const isOport  = view === 'oportunidades';

    document.getElementById('agendaview-agenda').classList.toggle('hidden', isTabela || isOport);
    document.getElementById('agendaview-tabela').classList.toggle('hidden', !isTabela);
    const oppEl = document.getElementById('agendaview-oportunidades');
    if (oppEl) oppEl.classList.toggle('hidden', !isOport);

    const views = ['agenda', 'planilha', 'kanban', 'oportunidades'];
    views.forEach(v => {
        const btn = document.getElementById(`btn-agendaview-${v}`);
        if (!btn) return;
        const active = v === view;
        btn.classList.toggle('bg-navy-900', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('border-navy-800', active);
        btn.classList.toggle('bg-white', !active);
        btn.classList.toggle('text-slate-500', !active);
        btn.classList.toggle('border-slate-300', !active);
    });

    if (view === 'planilha') {
        switchTableView('planilhas');
        renderTable();
    } else if (view === 'kanban') {
        switchTableView('kanban');
        renderTable();
    } else if (view === 'oportunidades') {
        if (typeof populateOppVacinaFilter === 'function') populateOppVacinaFilter();
        if (typeof renderOportunidades === 'function') renderOportunidades();
    }
}

function switchTab(tab) {
    const tabPermsMap = {
        dashboard: 'ver_dashboard',
        agenda:    'ver_agenda',
        pacientes: 'ver_pacientes',
        vacinas:   'ver_vacinas',
    };
    if (currentUser && !isCurrentUserAdmin() && tabPermsMap[tab] && !hasPerm(tabPermsMap[tab])) {
        showNotification('Você não tem permissão para visualizar esta aba.', 'error');
        return;
    }
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    const btn = document.getElementById(`btn-${tab}`);
    if (btn) btn.classList.add('active');

    const labels = { dashboard:'Dashboard', agenda:'Agenda', pacientes:'Pacientes', vacinas:'Vacinas' };
    const lbl = document.getElementById('topbar-module-label');
    if (lbl) lbl.textContent = labels[tab] || '';

    // A aba Vacinas gerencia scroll internamente; as demais precisam do main scrollável
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.style.overflow = tab === 'vacinas' ? 'hidden' : '';

    // FAB agendar: visível apenas na aba agenda
    const fabAgendar = document.getElementById('fab-novo-agendamento');
    if (fabAgendar) fabAgendar.classList.toggle('hidden', tab !== 'agenda');

    if(tab === 'dashboard') renderDashboard();
    if(tab === 'agenda') { switchAgendaView(agendaView); renderCalendar(); renderTable(); }
    if(tab === 'pacientes') renderPatients();
    if(tab === 'vacinas') {
        if (typeof switchAlmoxModulo === 'function') switchAlmoxModulo(almoxModulo || 'estoque');
        else renderVaccines();
        updateExpiryBadge();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const btn = document.getElementById('hamburger-btn');
    const isOpen = sidebar.classList.contains('sidebar-open');
    if (isOpen) {
        sidebar.classList.remove('sidebar-open');
        sidebar.classList.add('sidebar-collapsed');
        overlay.classList.add('hidden');
        btn.classList.remove('is-open');
    } else {
        sidebar.classList.remove('sidebar-collapsed');
        sidebar.classList.add('sidebar-open');
        overlay.classList.remove('hidden');
        btn.classList.add('is-open');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const btn = document.getElementById('hamburger-btn');
    sidebar.classList.remove('sidebar-open');
    sidebar.classList.add('sidebar-collapsed');
    overlay.classList.add('hidden');
    btn.classList.remove('is-open');
}

function switchDashView(view) {
    dashView = view;
    document.getElementById('dash-view-analitico').classList.toggle('hidden', view !== 'analitico');
    document.getElementById('dash-view-financeiro').classList.toggle('hidden', view !== 'financeiro');
    const btnA = document.getElementById('dash-tab-btn-analitico');
    const btnF = document.getElementById('dash-tab-btn-financeiro');
    if (view === 'analitico') {
        btnA.className = 'px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition bg-clinic-600 text-white shadow';
        btnF.className = 'px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition bg-navy-700 text-slate-400 hover:bg-navy-600 hover:text-white';
    } else {
        btnF.className = 'px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition bg-emerald-600 text-white shadow';
        btnA.className = 'px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition bg-navy-700 text-slate-400 hover:bg-navy-600 hover:text-white';
    }
    renderDashboard();
}

function switchSettingsTab(tab) {
    ['usuarios', 'unidades', 'backup', 'cpnicorr'].forEach(t => {
        document.getElementById(`settings-content-${t}`).classList.toggle('hidden', t !== tab);
        const btn = document.getElementById(`settings-tab-${t}`);
        btn.className = t === tab
            ? 'flex-1 py-3 text-xs font-black uppercase tracking-widest text-navy-700 bg-white border-b-2 border-clinic-500 transition'
            : 'flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 border-b-2 border-transparent transition';
    });
    if (tab === 'cpnicorr' && typeof renderCpniCorrecao === 'function') renderCpniCorrecao();
    if (tab === 'unidades' && typeof renderUnidadesList === 'function') { resetUnidadeForm(); renderUnidadesList(); }
}

function openSettings() {
    switchSettingsTab('usuarios');
    switchUsersSubTab('lista');
    renderUsersList();
    renderGroupsList();
    populateGroupSelect();
    if (typeof renderUnidadesList === 'function') { resetUnidadeForm(); renderUnidadesList(); }
    updateSelfRegisterUI();
    // Controla visibilidade das sub-tabs conforme permissão
    const canU = isCurrentUserAdmin() || hasPerm('criar_editar_usuarios');
    const canG = isCurrentUserAdmin() || hasPerm('criar_editar_grupos');
    const tabNovo = document.getElementById('users-subtab-novo');
    const tabGrupos = document.getElementById('users-subtab-grupos');
    if (tabNovo)   tabNovo.style.display   = canU ? '' : 'none';
    if (tabGrupos) tabGrupos.style.display = canG ? '' : 'none';
    // Correção CPNI: mesma permissão usada para editar registros importados (aplicador/admin)
    const canCpniCorr = isCurrentUserAdmin() || hasPerm('aplicar');
    const tabCpniCorr = document.getElementById('settings-tab-cpnicorr');
    if (tabCpniCorr) tabCpniCorr.style.display = canCpniCorr ? '' : 'none';
    // Unidades: só quem pode gerenciá-las vê a aba. Escolher a unidade no
    // agendamento continua liberado para todos.
    const tabUnidades = document.getElementById('settings-tab-unidades');
    if (tabUnidades) tabUnidades.style.display = (typeof canGerenciarUnidades === 'function' && canGerenciarUnidades()) ? '' : 'none';
    document.getElementById('modal-settings').classList.add('active');
}

function toggleLineBtn(id) {
    const btn = document.getElementById(id);
    const isOn = btn.dataset.on === '1';
    btn.dataset.on = isOn ? '0' : '1';
    if (btn.dataset.on === '1') {
        btn.className = 'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition bg-clinic-600 text-white shadow border border-clinic-600';
    } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition bg-white text-slate-400 border border-slate-200 hover:border-clinic-400 hover:text-clinic-600';
    }
    renderDashboard();
}

function toggleDashPeriodo() {
    const periodo = document.getElementById('dash-periodo').value;
    document.getElementById('dash-wrap-ano') && document.getElementById('dash-wrap-ano').classList.toggle('hidden', periodo !== 'ano');
    document.getElementById('dash-wrap-range') && document.getElementById('dash-wrap-range').classList.toggle('hidden', periodo !== 'personalizado');
    document.getElementById('dash-wrap-mes') && document.getElementById('dash-wrap-mes').classList.toggle('hidden', periodo !== 'mes');
    renderDashboard();
}

function populateDashDropdowns() {
    const appsPeriodo = getAppsByPeriodo();

    const curVac = document.getElementById('dash-filter-vacina').value;
    const curCol = document.getElementById('dash-filter-colaborador').value;

    // Vacinas presentes no período + respeitando o vendedor selecionado
    const appsParaVac = curCol ? appsPeriodo.filter(a => a.vendedor === curCol) : appsPeriodo;
    const vacIdsNoPeriodo = new Set(appsParaVac.map(a => String(a.vaccineId)));
    const vacOptions = vaccines
        .filter(v => vacIdsNoPeriodo.has(String(v.id)))
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(v => ({ value: String(v.id), label: v.nome }));
    if (curVac && !vacIdsNoPeriodo.has(curVac)) document.getElementById('dash-filter-vacina').value = '';
    renderDashPopList('vacina', vacOptions, 'Todas');

    // Vendedores presentes no período + respeitando a vacina selecionada
    const appsParaCol = curVac ? appsPeriodo.filter(a => String(a.vaccineId) === curVac) : appsPeriodo;
    const vendedoresNoPeriodo = new Set(appsParaCol.filter(a => a.vendedor).map(a => a.vendedor));
    const colOptions = appUsers
        .filter(u => u.isVendedor && u.ativo !== false && vendedoresNoPeriodo.has(u.nome))
        .map(u => u.nome)
        .sort()
        .map(nome => ({ value: nome, label: nome }));
    if (curCol && !vendedoresNoPeriodo.has(curCol)) document.getElementById('dash-filter-colaborador').value = '';
    renderDashPopList('vendedor', colOptions, 'Todos');
}

// ─── FILTROS DO DASHBOARD: POPOVERS ──────────────────────────────────────────
const _dashPopData = { vacina: [], vendedor: [] };

function renderDashPopList(key, options, allLabel) {
    _dashPopData[key] = options;
    const curVal = document.getElementById(key === 'vacina' ? 'dash-filter-vacina' : 'dash-filter-colaborador').value;
    const list = document.getElementById(`dfpop-${key}-list`);
    if (!list) return;
    const allActive = !curVal;
    let html = `<button type="button" class="dash-pop-item ${allActive ? 'active' : ''}" onclick="selectDashPopValue('${key}','')">
                    <i class="fas fa-check dash-pop-item-check"></i><span>${allLabel}</span>
                </button>`;
    html += options.map((o, i) => `
        <button type="button" class="dash-pop-item ${String(o.value) === curVal ? 'active' : ''}" data-label="${(o.label || '').toLowerCase()}" onclick="selectDashPopValueAt('${key}', ${i})">
            <i class="fas fa-check dash-pop-item-check"></i><span>${o.label}</span>
        </button>`).join('');
    if (!options.length) html += `<div class="dash-pop-empty">Nenhum resultado no período</div>`;
    list.innerHTML = html;
    updateDashFilterLabel(key, allLabel);
}

function filterDashPopList(key, term) {
    const list = document.getElementById(`dfpop-${key}-list`);
    if (!list) return;
    const t = term.trim().toLowerCase();
    list.querySelectorAll('.dash-pop-item[data-label]').forEach(btn => {
        btn.classList.toggle('hidden', !btn.dataset.label.includes(t));
    });
}

function selectDashPopValueAt(key, index) {
    const opt = _dashPopData[key][index];
    selectDashPopValue(key, opt ? String(opt.value) : '');
}

function selectDashPopValue(key, value) {
    const inputId = key === 'vacina' ? 'dash-filter-vacina' : 'dash-filter-colaborador';
    document.getElementById(inputId).value = value;
    const allLabel = key === 'vacina' ? 'Todas' : 'Todos';
    renderDashPopList(key, _dashPopData[key], allLabel);
    closeDashPops();
    renderDashboard();
}

function updateDashFilterLabel(key, allLabel) {
    const inputId = key === 'vacina' ? 'dash-filter-vacina' : 'dash-filter-colaborador';
    const val = document.getElementById(inputId).value;
    const labelEl = document.getElementById(`dfbtn-${key}-label`);
    if (!labelEl) return;
    const prefix = key === 'vacina' ? 'Vacina' : 'Vendedor';
    if (!val) { labelEl.textContent = `${prefix}: ${allLabel}`; return; }
    const found = (_dashPopData[key] || []).find(o => String(o.value) === val);
    labelEl.textContent = `${prefix}: ${found ? found.label : allLabel}`;
}

function toggleDashPop(key) {
    const pop = document.getElementById(`dfpop-${key}`);
    const isOpen = pop.classList.contains('active');
    closeDashPops();
    if (!isOpen) {
        pop.classList.add('active');
        document.getElementById(`dfbtn-${key}`).classList.add('active');
        setTimeout(() => document.addEventListener('click', _dashPopOutsideHandler), 0);
    }
}

function closeDashPops() {
    document.querySelectorAll('.dash-pop.active').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.dash-filter-btn.active').forEach(b => b.classList.remove('active'));
    document.removeEventListener('click', _dashPopOutsideHandler);
}

function _dashPopOutsideHandler(e) {
    // Usa composedPath em vez de e.target.closest: durante o clique de seleção do
    // intervalo de meses o grid é re-renderizado (innerHTML) no mesmo ciclo do
    // evento, desconectando o elemento original do DOM antes do "click" borbulhar —
    // e.target.closest() falharia nesse caso e fecharia o popover indevidamente.
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    const insidePop = path.some(el => el instanceof Element && el.classList && el.classList.contains('dash-filter-pop'));
    if (!insidePop) closeDashPops();
}

// ─── PERÍODO: MODOS ───────────────────────────────────────────────────────────
function initDashPeriodoFilters() {
    const ano = document.getElementById('dash-ano-base').value || new Date().getFullYear();
    document.getElementById('dash-ano-base-display').textContent = ano;
    _dashRangeCalYear = parseInt(ano, 10);
    document.querySelectorAll('.dash-period-tab').forEach(t => t.classList.toggle('active', t.dataset.periodo === 'ano'));
    renderDashRangeCalendar();
    updateDashPeriodoLabel();
}

// Restaura o filtro de Período para o estado padrão (Ano Inteiro / ano atual),
// usado pelo botão "Atualizar dados" do painel do dashboard.
function resetDashPeriodoFiltro() {
    const anoAtual = new Date().getFullYear();
    document.getElementById('dash-periodo').value = 'ano';
    document.getElementById('dash-ano-base').value = anoAtual;
    document.getElementById('dash-filter-mes').value = '';
    document.getElementById('dash-data-inicio').value = '';
    document.getElementById('dash-data-fim').value = '';

    _dashRangeStart = null;
    _dashRangeEnd = null;
    _dashRangePendingStart = null;
    _dashRangeDragging = false;
    _dashRangeDragMoved = false;

    document.getElementById('dash-filter-vacina').value = '';
    document.getElementById('dash-filter-colaborador').value = '';
    document.getElementById('dash-range-summary').textContent = 'Selecione um mês ou arraste para um intervalo';

    document.querySelectorAll('.dash-period-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('dash-period-panel-ano').classList.remove('hidden');

    initDashPeriodoFilters();
    closeDashPops();
    renderDashboard();
}

function setDashPeriodoMode(mode) {
    document.getElementById('dash-periodo').value = mode;
    document.querySelectorAll('.dash-period-tab').forEach(t => t.classList.toggle('active', t.dataset.periodo === mode));
    document.querySelectorAll('.dash-period-panel').forEach(p => p.classList.add('hidden'));
    const panel = document.getElementById(`dash-period-panel-${mode}`);
    if (panel) panel.classList.remove('hidden');

    if (mode === 'personalizado') renderDashRangeCalendar();

    updateDashPeriodoLabel();
    renderDashboard();
}

function updateDashPeriodoLabel() {
    const mode = document.getElementById('dash-periodo').value;
    const labelEl = document.getElementById('dfbtn-periodo-label');
    if (!labelEl) return;
    const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    if (mode === 'geral') {
        labelEl.textContent = 'Geral (Lifetime)';
    } else if (mode === 'ano') {
        labelEl.textContent = `Ano Inteiro · ${document.getElementById('dash-ano-base').value}`;
    } else if (mode === 'personalizado') {
        const ini = document.getElementById('dash-data-inicio').value;
        const fim = document.getElementById('dash-data-fim').value;
        if (ini && fim) {
            const [yi, mi] = ini.split('-');
            const [yf, mf] = fim.split('-');
            const a = `${MESES_ABREV[parseInt(mi,10)-1]}/${yi.slice(2)}`;
            const b = `${MESES_ABREV[parseInt(mf,10)-1]}/${yf.slice(2)}`;
            labelEl.textContent = a === b ? a : `${a} — ${b}`;
        } else {
            labelEl.textContent = 'Selecione o intervalo';
        }
    }
}

// ─── PERÍODO: ANO INTEIRO ─────────────────────────────────────────────────────
function stepDashAno(delta) {
    const input = document.getElementById('dash-ano-base');
    const next = (parseInt(input.value, 10) || new Date().getFullYear()) + delta;
    input.value = next;
    document.getElementById('dash-ano-base-display').textContent = next;
    updateDashPeriodoLabel();
    populateDashDropdowns();
    renderDashboard();
}

// ─── PERÍODO: INTERVALO PERSONALIZADO (grade de meses com drag-select) ────────
let _dashRangeCalYear = new Date().getFullYear();
let _dashRangeStart = null;   // { y, m } (m = 1-12)
let _dashRangeEnd   = null;
let _dashRangeDragging = false;
let _dashRangeDragAnchor = null;
let _dashRangeLastHoverMonth = null; // mês (1-12) sob o cursor, para continuar o arraste ao trocar de ano
let _dashRangeDragMoved = false;     // true se o cursor passou por outro mês durante o mousedown (= foi arraste)
let _dashRangePendingStart = null;   // { y, m } aguardando o clique do mês final (seleção por 2 cliques)

function stepDashRangeCalYear(delta) {
    _dashRangeCalYear += delta;
    if (_dashRangeDragging && _dashRangeLastHoverMonth) {
        _dashRangeMouseEnter(_dashRangeCalYear, _dashRangeLastHoverMonth);
    }
    renderDashRangeCalendar();
}

function _dashKeyToNum(y, m) { return y * 12 + (m - 1); }

function renderDashRangeCalendar() {
    document.getElementById('dash-range-cal-year').textContent = _dashRangeCalYear;
    const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const grid = document.getElementById('dash-range-cal-grid');

    let selMin = null, selMax = null;
    if (_dashRangeStart) {
        const a = _dashKeyToNum(_dashRangeStart.y, _dashRangeStart.m);
        const b = _dashRangeEnd ? _dashKeyToNum(_dashRangeEnd.y, _dashRangeEnd.m) : a;
        selMin = Math.min(a, b);
        selMax = Math.max(a, b);
    }

    grid.innerHTML = MESES_ABREV.map((m, i) => {
        const monthNum = i + 1;
        const num = _dashKeyToNum(_dashRangeCalYear, monthNum);
        const inRange = selMin !== null && num >= selMin && num <= selMax;
        const isEdgeStart = selMin !== null && num === selMin;
        const isEdgeEnd = selMax !== null && num === selMax;
        const isPending = _dashRangePendingStart && _dashKeyToNum(_dashRangePendingStart.y, _dashRangePendingStart.m) === num;
        const cls = ['dash-month-cell'];
        if (inRange) cls.push('in-range');
        if (isEdgeStart || isEdgeEnd) cls.push('active');
        if (isPending) cls.push('pending');
        return `<button type="button" class="${cls.join(' ')}"
                    data-y="${_dashRangeCalYear}" data-m="${monthNum}"
                    onmousedown="_dashRangeMouseDown(event, ${_dashRangeCalYear}, ${monthNum})"
                    onmouseenter="_dashRangeMouseEnter(${_dashRangeCalYear}, ${monthNum})"
                    onclick="_dashRangeClick(${_dashRangeCalYear}, ${monthNum})">${m}</button>`;
    }).join('');
}

// Clique simples (sem arraste): primeiro clique marca o início ("pending"),
// segundo clique num mês diferente fecha o intervalo. Clicar de novo no mesmo mês pendente reseta para seleção única.
function _dashRangeClick(y, m) {
    if (_dashRangeDragMoved) { _dashRangeDragMoved = false; return; } // foi arraste, já tratado no mouseup

    if (!_dashRangePendingStart) {
        _dashRangePendingStart = { y, m };
        _dashRangeStart = { y, m };
        _dashRangeEnd = { y, m };
        renderDashRangeCalendar();
        const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        document.getElementById('dash-range-summary').textContent = `${MESES_ABREV[m - 1]}/${y} selecionado — clique no mês final do intervalo`;
        return;
    }

    const a = _dashRangePendingStart;
    _dashRangePendingStart = null;
    const aNum = _dashKeyToNum(a.y, a.m);
    const bNum = _dashKeyToNum(y, m);
    if (aNum <= bNum) { _dashRangeStart = a; _dashRangeEnd = { y, m }; }
    else { _dashRangeStart = { y, m }; _dashRangeEnd = a; }
    renderDashRangeCalendar();
    _commitDashRange();
}

function _dashRangeMouseDown(e, y, m) {
    e.preventDefault();
    _dashRangeDragging = true;
    _dashRangeDragMoved = false;
    _dashRangeDragAnchor = { y, m };
    _dashRangeLastHoverMonth = m;
    document.addEventListener('mouseup', _dashRangeMouseUp);
}

function _dashRangeMouseEnter(y, m) {
    if (!_dashRangeDragging) return;
    _dashRangeDragMoved = true;
    _dashRangePendingStart = null;
    _dashRangeLastHoverMonth = m;
    const anchorNum = _dashKeyToNum(_dashRangeDragAnchor.y, _dashRangeDragAnchor.m);
    const curNum = _dashKeyToNum(y, m);
    if (curNum >= anchorNum) {
        _dashRangeStart = _dashRangeDragAnchor;
        _dashRangeEnd = { y, m };
    } else {
        _dashRangeStart = { y, m };
        _dashRangeEnd = _dashRangeDragAnchor;
    }
    renderDashRangeCalendar();
}

function _dashRangeMouseUp() {
    if (!_dashRangeDragging) return;
    _dashRangeDragging = false;
    _dashRangeLastHoverMonth = null;
    document.removeEventListener('mouseup', _dashRangeMouseUp);
    if (_dashRangeDragMoved) {
        _commitDashRange();
    }
    // se não moveu, deixa o onclick (_dashRangeClick) decidir (1º ou 2º clique)
}

function _commitDashRange() {
    if (!_dashRangeStart) return;
    const a = _dashRangeStart, b = _dashRangeEnd || _dashRangeStart;
    const lastDay = new Date(b.y, b.m, 0).getDate();
    document.getElementById('dash-data-inicio').value = `${a.y}-${String(a.m).padStart(2, '0')}-01`;
    document.getElementById('dash-data-fim').value = `${b.y}-${String(b.m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const la = `${MESES_ABREV[a.m - 1]}/${a.y}`;
    const lb = `${MESES_ABREV[b.m - 1]}/${b.y}`;
    document.getElementById('dash-range-summary').textContent = (a.y === b.y && a.m === b.m) ? la : `${la} — ${lb}`;

    updateDashPeriodoLabel();
    renderDashboard();
}

function populateVaccineSelects() {
    const sel = document.getElementById('reg-vacina');
    let current = sel.value;
    sel.innerHTML = '<option value="">Selecione...</option>' + vaccines.filter(v => v.ativo !== false).map(v => `<option value="${v.id}">${v.nome}</option>`).join('');
    sel.value = current;
}

function populateCancelReasons() {
    const sel = document.getElementById('reg-motivo-cancelamento');
    const cur = sel.value;
    const sorted = [...cancelReasons].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    sel.innerHTML = '<option value="">Selecione...</option>' + sorted.map(r => `<option value="${r}">${r}</option>`).join('');
    if (cur) sel.value = cur;
}

function populateGroupSelect() {
    const sel = document.getElementById('new-user-grupo');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Selecione...</option>' + appGroups.map(g => `<option value="${g.id}">${g.nome}</option>`).join('');
    if (cur) sel.value = cur;
}

function updateExpiryBadge() {
    const alerts = getExpiryAlerts();
    const count = alerts.length;
    const text = count > 99 ? '99+' : count;
    // badge principal (módulo Produtos) + badges secundários (Lotes, Movimentação)
    const badges = [
        document.getElementById('expiry-badge'),
        ...document.querySelectorAll('.alm-expiry-badge')
    ];
    badges.forEach(badge => {
        if (!badge) return;
        if (count > 0) {
            badge.classList.remove('hidden');
            badge.classList.add('flex');
            badge.textContent = text;
        } else {
            badge.classList.add('hidden');
            badge.classList.remove('flex');
        }
    });
}

function switchUsersSubTab(tab) {
    ['lista', 'novo', 'grupos'].forEach(t => {
        document.getElementById(`users-sub-${t}`).classList.toggle('hidden', t !== tab);
        const btn = document.getElementById(`users-subtab-${t}`);
        btn.className = t === tab
            ? 'px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-black uppercase transition'
            : 'px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase hover:bg-slate-200 transition';
    });
    if (tab === 'lista')   renderUsersList();
    if (tab === 'grupos')  { renderGroupsList(); resetGroupForm(); }
    if (tab === 'novo')    { resetUserForm(); populateGroupSelect(); }
}

function toggleVaccineSearch() {
    const wrapper = document.getElementById('vaccine-search-wrapper');
    const input = document.getElementById('filter-vaccine');
    const isOpen = wrapper.style.maxWidth !== '0px' && wrapper.style.maxWidth !== '0';
    if(isOpen) {
        wrapper.style.maxWidth = '0';
        input.value = '';
        renderVaccines();
    } else {
        wrapper.style.maxWidth = '220px';
        setTimeout(() => input.focus(), 300);
    }
}

function toggleExpiryPanel(e) {
    if (e) e.stopPropagation();
    const panel = document.getElementById('expiry-panel');
    if (panel.classList.contains('hidden')) {
        renderExpiryPanel();
        // Posiciona com fixed relativo ao botão sino que foi clicado
        const btn = (e && e.currentTarget) ? e.currentTarget : document.getElementById('btn-expiry-bell');
        const rect = btn.getBoundingClientRect();
        panel.style.top = (rect.bottom + 8) + 'px';
        // Alinha pela direita do botão, sem sair da tela
        const panelWidth = 384; // w-96 = 24rem = 384px
        const rightEdge = rect.right;
        const leftPos = Math.max(8, rightEdge - panelWidth);
        panel.style.left = leftPos + 'px';
        panel.style.right = 'auto';
        panel.classList.remove('hidden');
        panel.classList.add('flex');
    } else {
        panel.classList.add('hidden');
        panel.classList.remove('flex');
    }
}
