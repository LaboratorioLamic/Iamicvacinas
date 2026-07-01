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
    ['usuarios', 'backup'].forEach(t => {
        document.getElementById(`settings-content-${t}`).classList.toggle('hidden', t !== tab);
        const btn = document.getElementById(`settings-tab-${t}`);
        btn.className = t === tab
            ? 'flex-1 py-3 text-xs font-black uppercase tracking-widest text-navy-700 bg-white border-b-2 border-clinic-500 transition'
            : 'flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 border-b-2 border-transparent transition';
    });
}

function openSettings() {
    switchSettingsTab('usuarios');
    switchUsersSubTab('lista');
    renderUsersList();
    renderGroupsList();
    populateGroupSelect();
    // Controla visibilidade das sub-tabs conforme permissão
    const canU = isCurrentUserAdmin() || hasPerm('criar_editar_usuarios');
    const canG = isCurrentUserAdmin() || hasPerm('criar_editar_grupos');
    const tabNovo = document.getElementById('users-subtab-novo');
    const tabGrupos = document.getElementById('users-subtab-grupos');
    if (tabNovo)   tabNovo.style.display   = canU ? '' : 'none';
    if (tabGrupos) tabGrupos.style.display = canG ? '' : 'none';
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
    document.getElementById('dash-wrap-ano').classList.toggle('hidden', periodo !== 'ano');
    document.getElementById('dash-wrap-range').classList.toggle('hidden', periodo !== 'personalizado');
    document.getElementById('dash-wrap-mes').classList.toggle('hidden', periodo !== 'mes');
    renderDashboard();
}

function populateDashDropdowns() {
    const appsPeriodo = getAppsByPeriodo();

    // Vacinas presentes no período
    const vacSel = document.getElementById('dash-filter-vacina');
    const curVac = vacSel.value;
    vacSel.innerHTML = '<option value="">Todas</option>';
    const vacIdsNoPeriodo = new Set(appsPeriodo.map(a => String(a.vaccineId)));
    vaccines
        .filter(v => vacIdsNoPeriodo.has(String(v.id)))
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = v.nome;
            if (String(v.id) === curVac) opt.selected = true;
            vacSel.appendChild(opt);
        });
    if (curVac && !vacIdsNoPeriodo.has(curVac)) vacSel.value = '';

    // Vendedores presentes no período
    const colSel = document.getElementById('dash-filter-colaborador');
    const curCol = colSel.value;
    colSel.innerHTML = '<option value="">Todos</option>';
    const vendedoresNoPeriodo = new Set(appsPeriodo.filter(a => a.vendedor).map(a => a.vendedor));
    appUsers
        .filter(u => u.isVendedor && u.ativo !== false && vendedoresNoPeriodo.has(u.nome))
        .map(u => u.nome)
        .sort()
        .forEach(nome => {
            const opt = document.createElement('option');
            opt.value = nome;
            opt.textContent = nome;
            if (nome === curCol) opt.selected = true;
            colSel.appendChild(opt);
        });
    if (curCol && !vendedoresNoPeriodo.has(curCol)) colSel.value = '';
}

function populateVaccineSelects() {
    const sel = document.getElementById('reg-vacina');
    let current = sel.value;
    sel.innerHTML = '<option value="">Selecione...</option>' + vaccines.filter(v => v.ativo !== false).map(v => `<option value="${v.id}">${v.nome}</option>`).join('');
    sel.value = current;
}

function populateCancelReasons() {
    const sel = document.getElementById('reg-motivo-cancelamento');
    sel.innerHTML = '<option value="">Selecione...</option>' + cancelReasons.map(r => `<option value="${r}">${r}</option>`).join('');
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
