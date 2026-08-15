/* ══════════════════════════════════════════════════════════════════════════
   IMUNOGEST — CAMADA MOBILE (comportamento)
   Complementa css/mobile.css: aplica body.is-mobile, monta a barra inferior
   de navegação, o painel recolhível de filtros, o kanban de coluna única e a
   folha "Mover para". Nada aqui roda no desktop.
   ══════════════════════════════════════════════════════════════════════════ */

const MOBILE_MQ = window.matchMedia('(max-width: 768px)');

function isMobileView() { return MOBILE_MQ.matches; }

// ─── BARRA INFERIOR DE NAVEGAÇÃO ──────────────────────────────────────────────
const MOBILE_TABS = [
    { tab: 'agenda',    icon: 'fa-calendar-alt', label: 'Agenda' },
    { tab: 'pacientes', icon: 'fa-users',        label: 'Pacientes' },
    { tab: 'vacinas',   icon: 'fa-vial',         label: 'Vacinas' },
    { tab: 'dashboard', icon: 'fa-chart-pie',    label: 'Painel' },
];

function buildMobileNav() {
    if (document.getElementById('mobile-nav')) return;
    const nav = document.createElement('nav');
    nav.id = 'mobile-nav';
    nav.setAttribute('aria-label', 'Navegação principal');
    nav.innerHTML = MOBILE_TABS.map(t => `
        <button type="button" data-mtab="${t.tab}" onclick="mobileGoTab('${t.tab}')" aria-label="${t.label}">
            <i class="fas ${t.icon}"></i><span>${t.label}</span>
        </button>`).join('') + `
        <button type="button" data-mtab="mais" onclick="mobileOpenMenu()" aria-label="Mais opções">
            <i class="fas fa-bars"></i><span>Mais</span>
        </button>`;
    document.body.appendChild(nav);
    syncMobileNavPerms();
    setMobileNavActive();
}

function mobileGoTab(tab) {
    closeSidebar();
    switchTab(tab);
}

function mobileOpenMenu() {
    toggleSidebar();
}

function setMobileNavActive() {
    const nav = document.getElementById('mobile-nav');
    if (!nav) return;
    const active = document.querySelector('.tab-content.active');
    const current = active ? active.id.replace('tab-', '') : '';
    nav.querySelectorAll('button[data-mtab]').forEach(b => {
        b.classList.toggle('active', b.dataset.mtab === current);
    });
}

// Espelha na barra inferior as permissões já aplicadas aos botões da sidebar
function syncMobileNavPerms() {
    const nav = document.getElementById('mobile-nav');
    if (!nav) return;
    MOBILE_TABS.forEach(t => {
        const side = document.getElementById(`btn-${t.tab}`);
        const btn = nav.querySelector(`button[data-mtab="${t.tab}"]`);
        if (side && btn) btn.style.display = side.style.display === 'none' ? 'none' : '';
    });
}

// ─── PAINEL RECOLHÍVEL DE FILTROS ─────────────────────────────────────────────
// Não move nada no DOM (os IDs continuam onde estão): apenas insere um botão
// "Filtros" antes de cada barra marcada com .m-filterbar e alterna a classe.
function buildMobileFilterToggles() {
    document.querySelectorAll('.m-filterbar').forEach((bar, i) => {
        if (bar.previousElementSibling && bar.previousElementSibling.classList.contains('m-filters-btn')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'm-filters-btn mobile-only';
        btn.innerHTML = '<i class="fas fa-sliders-h"></i><span>Filtros</span>';
        btn.onclick = () => {
            const open = bar.classList.toggle('m-filters-open');
            btn.classList.toggle('active', open);
        };
        bar.parentNode.insertBefore(btn, bar);
        if (!bar.id) bar.id = `m-filterbar-${i}`;
    });
}

// ─── SUB-NAVEGAÇÃO → BARRA DE ÍCONES ──────────────────────────────────────────
// As sub-abas (.m-chips) viram botões ícone+rótulo curto, iguais aos da barra
// inferior. O texto original do botão é envolvido num <span> para poder ser
// substituído pelo rótulo curto sem perder o ícone nem o onclick.
const MOBILE_CHIP_LABELS = {
    'btn-agendaview-kanban': 'CRM',
    'btn-agendaview-agenda': 'Agenda',
    'btn-agendaview-planilha': 'Planilha',
    'btn-agendaview-oportunidades': 'Oport.',
    'btn-opp-sub-aprazamento': 'Apraz.',
    'btn-opp-sub-oferta': 'Oferta',
};

function buildMobileChipBars() {
    document.querySelectorAll('.m-chips > button').forEach(btn => {
        if (btn.querySelector('.m-chip-lbl')) return;
        const short = MOBILE_CHIP_LABELS[btn.id];
        const label = document.createElement('span');
        label.className = 'm-chip-lbl';
        label.textContent = short || btn.textContent.trim();
        // Remove só os nós de texto soltos; o <i> do ícone permanece
        Array.from(btn.childNodes).forEach(n => { if (n.nodeType === 3) n.remove(); });
        btn.appendChild(label);
    });
}

// ─── TABELAS → CARTÕES ────────────────────────────────────────────────────────
// Copia o texto de cada <th> para o data-label do <td> correspondente; o CSS
// usa esse atributo como rótulo do cartão. Evita duplicar rótulos em todos os
// renderizadores (planilha, almoxarifado, usuários…).
function mobileLabelTables(root) {
    (root || document).querySelectorAll('.tbl-cards table').forEach(table => {
        const heads = Array.from(table.querySelectorAll('thead th'))
            .map(th => th.textContent.trim().replace(/\s+/g, ' '));
        if (!heads.length) return;
        table.querySelectorAll('tbody > tr').forEach(tr => {
            Array.from(tr.children).forEach((td, i) => {
                if (td.hasAttribute('colspan') || td.hasAttribute('data-label')) return;
                if (heads[i]) td.setAttribute('data-label', heads[i]);
            });
        });
    });
}

function _watchTables() {
    document.querySelectorAll('.tbl-cards tbody').forEach(tbody => {
        if (tbody.dataset.mObserved === '1') return;
        tbody.dataset.mObserved = '1';
        new MutationObserver(() => mobileLabelTables(tbody.closest('.tbl-cards')))
            .observe(tbody, { childList: true });
    });
    mobileLabelTables();
}

// ─── KANBAN: CARROSSEL (uma coluna por tela, arrastando para os lados) ────────
let _mKanbanCol = 'Nova oportunidade';

function _mKanbanCols() {
    const board = document.getElementById('kanban-board');
    return board ? Array.from(board.querySelectorAll('.kanban-col')) : [];
}

function _mKanbanApply() {
    const board = document.getElementById('kanban-board');
    if (!board) return;
    const cols = _mKanbanCols();
    if (!cols.length) return;
    if (!cols.some(c => c.dataset.col === _mKanbanCol)) _mKanbanCol = cols[0].dataset.col;

    // Pontos de posição abaixo do quadro
    let dots = document.getElementById('m-kanban-dots');
    if (!dots) {
        dots = document.createElement('div');
        dots.id = 'm-kanban-dots';
        dots.className = 'mobile-only';
        board.parentNode.insertBefore(dots, board.nextSibling);
    }
    dots.innerHTML = cols.map(c => {
        const key = c.dataset.col;
        return `<button type="button" aria-label="${key}" title="${key}"
            onclick="mobileKanbanShowCol('${key.replace(/'/g, "\\'")}')"></button>`;
    }).join('');

    // O quadro é recriado a cada render: devolve a coluna que estava visível
    const idx = cols.findIndex(c => c.dataset.col === _mKanbanCol);
    if (idx > -1) board.scrollLeft = cols[idx].offsetLeft - board.offsetLeft;
    _mKanbanSyncDots();

    // Acompanha o arrasto para atualizar a coluna corrente
    if (board.dataset.mSwipe !== '1') {
        board.dataset.mSwipe = '1';
        let t = null;
        board.addEventListener('scroll', () => {
            clearTimeout(t);
            t = setTimeout(() => {
                const list = _mKanbanCols();
                if (!list.length) return;
                const center = board.scrollLeft + board.clientWidth / 2;
                const cur = list.reduce((best, c) => {
                    const mid = c.offsetLeft - board.offsetLeft + c.offsetWidth / 2;
                    return Math.abs(mid - center) < Math.abs(best.mid - center) ? { col: c, mid } : best;
                }, { col: list[0], mid: Infinity }).col;
                _mKanbanCol = cur.dataset.col;
                _mKanbanSyncDots();
            }, 80);
        }, { passive: true });
    }

    // Botão "Mover" em cada card de grupo (o arrastar entre colunas não existe no toque)
    board.querySelectorAll('.kanban-group-card').forEach(card => {
        const slot = card.querySelector('.kb-mob-move');
        if (!slot || slot.dataset.ready === '1') return;
        const patId = card.dataset.pat;
        const status = card.dataset.status;
        slot.innerHTML = `<button type="button" class="m-move-btn"
            onclick="event.stopPropagation();mobileMoveGroup('${patId}','${String(status).replace(/'/g, "\\'")}')"
            title="Mover para outra etapa"><i class="fas fa-arrow-right-arrow-left"></i>Mover</button>`;
        slot.dataset.ready = '1';
    });
}

function _mKanbanSyncDots() {
    const dots = document.getElementById('m-kanban-dots');
    if (!dots) return;
    const cols = _mKanbanCols();
    Array.from(dots.children).forEach((b, i) => {
        b.classList.toggle('active', cols[i] && cols[i].dataset.col === _mKanbanCol);
    });
}

function mobileKanbanShowCol(key) {
    const board = document.getElementById('kanban-board');
    const col = _mKanbanCols().find(c => c.dataset.col === key);
    if (!board || !col) return;
    _mKanbanCol = key;
    board.scrollTo({ left: col.offsetLeft - board.offsetLeft, behavior: 'smooth' });
    _mKanbanSyncDots();
}

// ─── FOLHA "MOVER PARA" ───────────────────────────────────────────────────────
const MOBILE_STATUSES = [
    { key: 'Nova oportunidade', icon: 'fa-star',            color: '#64748b' },
    { key: 'Em negociação',     icon: 'fa-comments',        color: '#0891b2' },
    { key: 'Agendado',          icon: 'fa-calendar-check',  color: '#2563eb' },
    { key: 'Aplicado',          icon: 'fa-syringe',         color: '#16a34a' },
    { key: 'Perdido',           icon: 'fa-ban',             color: '#dc2626' },
];

function mobileMoveGroup(patId, fromStatus) {
    const pat = typeof getPatientById === 'function' ? getPatientById(patId) : null;
    _mobileOpenSheet(
        pat ? pat.nome : 'Mover agendamentos',
        MOBILE_STATUSES.filter(s => s.key !== fromStatus).map(s => ({
            label: s.key,
            icon: s.icon,
            color: s.color,
            run: () => _handleGroupDrop(patId, fromStatus, s.key),
        }))
    );
}

function _mobileOpenSheet(title, options) {
    let sheet = document.getElementById('m-action-sheet');
    if (!sheet) {
        sheet = document.createElement('div');
        sheet.id = 'm-action-sheet';
        sheet.className = 'fixed inset-0 z-[600] hidden';
        sheet.innerHTML = `
            <div class="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" onclick="mobileCloseSheet()"></div>
            <div class="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl overflow-hidden shadow-2xl"
                 style="padding-bottom:calc(0.75rem + env(safe-area-inset-bottom,0px));max-height:80dvh;overflow-y:auto;">
                <div class="px-4 pt-4 pb-2 flex items-center justify-between gap-3 border-b border-slate-100">
                    <p id="m-sheet-title" class="font-black text-navy-900 text-sm truncate"></p>
                    <button type="button" onclick="mobileCloseSheet()" class="h-8 w-8 rounded-lg text-slate-400"><i class="fas fa-times"></i></button>
                </div>
                <div id="m-sheet-body" class="p-3 space-y-1.5"></div>
            </div>`;
        document.body.appendChild(sheet);
    }
    sheet.querySelector('#m-sheet-title').textContent = title || '';
    const body = sheet.querySelector('#m-sheet-body');
    body.innerHTML = '';
    options.forEach((opt, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 text-left font-black text-xs uppercase tracking-wide text-slate-700';
        b.innerHTML = `<span class="h-8 w-8 rounded-lg flex items-center justify-center text-white shrink-0"
            style="background:${opt.color || '#2563eb'}"><i class="fas ${opt.icon || 'fa-chevron-right'} text-xs"></i></span>${opt.label}`;
        b.onclick = () => { mobileCloseSheet(); opt.run(); };
        body.appendChild(b);
        b.dataset.idx = i;
    });
    sheet.classList.remove('hidden');
}

function mobileCloseSheet() {
    const sheet = document.getElementById('m-action-sheet');
    if (sheet) sheet.classList.add('hidden');
}

// ─── APLICAÇÃO / SINCRONIZAÇÃO DO MODO ────────────────────────────────────────
function _applyMobileMode() {
    const on = isMobileView();
    document.body.classList.toggle('is-mobile', on);
    if (on) {
        buildMobileNav();
        buildMobileChipBars();
        buildMobileFilterToggles();
        setMobileNavActive();
        _watchTables();
        _mKanbanApply();
    } else {
        // Volta ao layout desktop sem resíduos
        document.querySelectorAll('.m-filterbar.m-filters-open').forEach(b => b.classList.remove('m-filters-open'));
        document.querySelectorAll('.m-filters-btn.active').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.kanban-col.m-col-active').forEach(c => c.classList.remove('m-col-active'));
        mobileCloseSheet();
    }
}

// Ao trocar de faixa (girar o aparelho, redimensionar), re-renderiza a aba ativa
// para que os renderizadores dependentes de isMobileView() refaçam o HTML.
MOBILE_MQ.addEventListener('change', () => {
    _applyMobileMode();
    const active = document.querySelector('.tab-content.active');
    if (active && typeof switchTab === 'function' && typeof _appReady !== 'undefined' && _appReady) {
        switchTab(active.id.replace('tab-', ''));
    }
});

// ─── GANCHOS NAS FUNÇÕES EXISTENTES ───────────────────────────────────────────
// switchTab / applyPermissions / renderKanban continuam sendo as fontes da
// verdade; aqui só reagimos a elas.
(function hookExisting() {
    const _switchTab = window.switchTab;
    window.switchTab = function (...args) {
        const r = _switchTab.apply(this, args);
        setMobileNavActive();
        if (isMobileView()) buildMobileFilterToggles();
        return r;
    };

    const _applyPermissions = window.applyPermissions;
    if (typeof _applyPermissions === 'function') {
        window.applyPermissions = function (...args) {
            const r = _applyPermissions.apply(this, args);
            syncMobileNavPerms();
            return r;
        };
    }

    const _renderKanban = window.renderKanban;
    if (typeof _renderKanban === 'function') {
        window.renderKanban = function (...args) {
            const r = _renderKanban.apply(this, args);
            if (isMobileView()) _mKanbanApply();
            return r;
        };
    }
})();

document.addEventListener('DOMContentLoaded', _applyMobileMode);
_applyMobileMode();
