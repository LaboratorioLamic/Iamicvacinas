// ─── TABLE VIEW (from index.html lines ~3535-3709) ────────────────────────────

function setSortTable(field) {
    if(tableSortField === field) {
        tableSortDir = tableSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        tableSortField = field;
        tableSortDir = 'asc';
    }
    ['data','paciente','vacina','status'].forEach(f => {
        const icon = document.getElementById(`sort-icon-${f}`);
        if(!icon) return;
        if(f === tableSortField) {
            icon.className = `fas ${tableSortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down'} text-clinic-400`;
        } else {
            icon.className = 'fas fa-sort text-slate-500';
        }
    });
    renderTable();
}

function toggleTableFilter(wrapId, focusId, isSelect) {
    const wrap = document.getElementById(wrapId);
    const isOpen = wrap.style.maxWidth !== '0px' && wrap.style.maxWidth !== '0';
    if (isOpen) {
        wrap.style.maxWidth = '0';
        wrap.style.opacity = '0';
        if (focusId) { document.getElementById(focusId).value = ''; renderTable(); }
        if (isSelect) {
            const sel = wrap.querySelector('select');
            if (sel) { sel.value = ''; renderTable(); }
        }
    } else {
        wrap.style.maxWidth = '240px';
        wrap.style.opacity = '1';
        if (focusId) setTimeout(() => document.getElementById(focusId).focus(), 310);
    }
}

function getStartOfWeek(date) { const d = new Date(date); const day = d.getDay(); const diff = d.getDate() - day; return new Date(d.setDate(diff)); }

function _populateTableColabDropdowns() {
    const dateFilter = document.getElementById('filter-date-agenda').value;
    const monthFilter = document.getElementById('filter-month-agenda').value;
    const todayStr = new Date().toISOString().split('T')[0];
    const startOfWeek = getStartOfWeek(new Date()).toISOString().split('T')[0];
    const endOfWeek = new Date(new Date(startOfWeek).setDate(new Date(startOfWeek).getDate()+6)).toISOString().split('T')[0];

    const byDate = appointments.filter(a => {
        let matchDate = true;
        if (dateFilter === 'hoje') matchDate = a.data === todayStr;
        else if (dateFilter === 'semana') matchDate = a.data >= startOfWeek && a.data <= endOfWeek;
        else if (dateFilter === 'mes' && monthFilter) matchDate = a.data.startsWith(monthFilter);
        return matchDate;
    });

    const vendedorSel = document.getElementById('filter-vendedor-agenda');
    const curVend = vendedorSel.value;
    vendedorSel.innerHTML = '<option value="">Todos os Vendedores</option>';
    const vendedoresNoPeriodo = [...new Set(byDate.filter(a => a.vendedor).map(a => a.vendedor))].sort();
    vendedoresNoPeriodo.forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome; opt.textContent = nome;
        if (nome === curVend) opt.selected = true;
        vendedorSel.appendChild(opt);
    });
    if (curVend && !vendedoresNoPeriodo.includes(curVend)) vendedorSel.value = '';

    const aplicadorSel = document.getElementById('filter-aplicador-agenda');
    const curApl = aplicadorSel.value;
    aplicadorSel.innerHTML = '<option value="">Todos os Aplicadores</option>';
    const aplicadoresNoPeriodo = [...new Set(byDate.filter(a => a.aplicador).map(a => a.aplicador))].sort();
    aplicadoresNoPeriodo.forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome; opt.textContent = nome;
        if (nome === curApl) opt.selected = true;
        aplicadorSel.appendChild(opt);
    });
    if (curApl && !aplicadoresNoPeriodo.includes(curApl)) aplicadorSel.value = '';
}

function renderTable() {
    _populateTableColabDropdowns();

    const search = normalizeStr(document.getElementById('filter-search-agenda').value);
    const status = document.getElementById('filter-status-agenda').value;
    const dateFilter = document.getElementById('filter-date-agenda').value;
    const monthFilter = document.getElementById('filter-month-agenda').value;
    const filterVendedor = document.getElementById('filter-vendedor-agenda').value;
    const filterAplicador = document.getElementById('filter-aplicador-agenda').value;

    const todayObj = new Date();
    const todayStr = todayObj.toISOString().split('T')[0];
    const startOfWeek = getStartOfWeek(todayObj).toISOString().split('T')[0];
    const endOfWeek = new Date(new Date(startOfWeek).setDate(new Date(startOfWeek).getDate()+6)).toISOString().split('T')[0];

    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    let filtered = appointments.filter(a => {
        const pat = patients.find(p=>p.id==a.patientId);
        const vac = vaccines.find(v=>v.id==a.vaccineId);
        if(!pat || !vac) return false;
        const nomeNorm = normalizeStr(pat.nome);
        const cpfNorm = normalizeStr(pat.cpf);
        const matchSearch = nomeNorm.includes(search) || cpfNorm.includes(search);
        const matchStatus = status === '' || a.status === status;
        const matchVendedor = !filterVendedor || a.vendedor === filterVendedor;
        const matchAplicador = !filterAplicador || a.aplicador === filterAplicador;
        let matchDate = true;
        if(dateFilter === 'hoje') matchDate = a.data === todayStr;
        else if(dateFilter === 'semana') matchDate = a.data >= startOfWeek && a.data <= endOfWeek;
        else if(dateFilter === 'mes' && monthFilter) matchDate = a.data.startsWith(monthFilter);
        return matchSearch && matchStatus && matchDate && matchVendedor && matchAplicador;
    }).sort((a, b) => {
        const dir = tableSortDir === 'asc' ? 1 : -1;
        if(tableSortField === 'data') return (new Date(a.data) - new Date(b.data)) * dir;
        if(tableSortField === 'paciente') {
            const pA = patients.find(p=>p.id==a.patientId)?.nome || '';
            const pB = patients.find(p=>p.id==b.patientId)?.nome || '';
            return pA.localeCompare(pB, 'pt-BR') * dir;
        }
        if(tableSortField === 'vacina') {
            const vA = vaccines.find(v=>v.id==a.vaccineId)?.nome || '';
            const vB = vaccines.find(v=>v.id==b.vaccineId)?.nome || '';
            return vA.localeCompare(vB, 'pt-BR') * dir;
        }
        if(tableSortField === 'status') return a.status.localeCompare(b.status, 'pt-BR') * dir;
        return 0;
    });

    filtered.forEach(a => {
        const pat = patients.find(p=>p.id==a.patientId);
        const vac = vaccines.find(v=>v.id==a.vaccineId);
        const isDelayed = a.data < todayStr && a.status === 'Agendado';
        let stClass = a.status==='Aplicado'?'bg-green-100 text-green-700':a.status==='Perdido'?'bg-red-100 text-red-700':a.status==='Em negociação'?'bg-cyan-100 text-cyan-700':isDelayed?'bg-yellow-100 text-yellow-700 border border-yellow-300':'bg-blue-100 text-blue-700';

        tbody.innerHTML += `<tr onclick="editRecord(${a.id})" class="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:bg-clinic-50 hover:shadow-md active:translate-y-0 active:bg-clinic-100 group">
            <td class="p-4 font-bold text-slate-700 whitespace-nowrap group-hover:text-clinic-700">${a.data.split('-').reverse().join('/')}${a.hora ? ' <span class="text-[10px] text-slate-400 font-bold">'+a.hora+'</span>' : ''} ${isDelayed?'<i class="fas fa-exclamation-triangle text-yellow-500 ml-1" title="Atrasado"></i>':''}</td>
            <td class="p-4">
                <div class="flex items-center gap-2">
                    <a href="https://wa.me/55${formatWa(pat.contato)}" target="_blank" onclick="event.stopPropagation()" class="h-7 w-7 shrink-0 bg-green-100 text-green-600 hover:bg-green-500 hover:text-white rounded-lg flex items-center justify-center transition shadow-sm" title="WhatsApp"><i class="fab fa-whatsapp text-sm"></i></a>
                    <div>
                        <div class="font-bold text-navy-900 group-hover:text-clinic-700">${pat.nome}</div>
                        <div class="text-[10px] text-slate-500">Idade: ${getAge(pat.dtNasc)} anos | CPF: ${pat.cpf}</div>
                    </div>
                </div>
            </td>
            <td class="p-4">
                <div class="font-bold whitespace-nowrap">${vac.nome}</div>
                <div class="text-[10px] font-black text-clinic-600 bg-clinic-50 inline-block px-1 rounded">${a.doseAtual}</div>
            </td>
            <td class="p-4 text-center"><span class="px-2 py-1 rounded text-[10px] font-black uppercase whitespace-nowrap ${stClass}">${isDelayed ? 'Atrasado' : a.status}</span></td>
            <td class="p-4 text-center" onclick="event.stopPropagation()">
                <div class="flex justify-center gap-2 flex-wrap">
                    ${a.status === 'Em negociação' ? permBtn('criar_agendamento', `<button onclick="openAgendarModal(${a.id})" class="h-8 w-8 bg-blue-500 text-white hover:bg-blue-600 rounded flex items-center justify-center transition shadow-sm" title="Agendar"><i class="fas fa-calendar-check"></i></button>`) : ''}
                    ${a.status === 'Agendado' ? permBtn('aplicar', `<button onclick="openConcluirModal(${a.id})" class="h-8 w-8 bg-green-500 text-white hover:bg-green-600 rounded flex items-center justify-center transition shadow-sm" title="Aplicar"><i class="fas fa-syringe"></i></button>`) : ''}
                </div>
            </td>
        </tr>`;
    });
    if (tableView === 'kanban') renderKanban();
}

// ─── FILTROS POPOVER (Período / Status) ───────────────────────────────────────
const _DATE_FILTER_META = {
    todos:  { label: 'Todas as Datas' },
    hoje:   { label: 'Hoje' },
    semana: { label: 'Esta Semana' },
    mes:    { label: 'Selecionar Mês' },
};

const _STATUS_FILTER_OPTS = [
    { val: '',                  label: 'Todos os Status',   color: '#94a3b8', icon: 'fa-layer-group' },
    { val: 'Nova oportunidade', label: 'Nova oportunidade', color: '#64748b', icon: 'fa-star' },
    { val: 'Em negociação',     label: 'Em negociação',     color: '#0891b2', icon: 'fa-comments' },
    { val: 'Agendado',          label: 'Agendado',          color: '#2563eb', icon: 'fa-calendar-check' },
    { val: 'Aplicado',          label: 'Aplicado',          color: '#16a34a', icon: 'fa-syringe' },
    { val: 'Perdido',           label: 'Perdido',           color: '#dc2626', icon: 'fa-ban' },
];

// Posiciona um popover (fixed) sob o botão, alinhado à direita, sem ser cortado por overflow.
function _positionFilterPop(btn, pop) {
    const r = btn.getBoundingClientRect();
    const w = pop.offsetWidth || 256;
    let left = r.right - w;
    if (left < 8) left = 8;
    const maxLeft = window.innerWidth - w - 8;
    if (left > maxLeft) left = Math.max(8, maxLeft);
    pop.style.top  = (r.bottom + 8) + 'px';
    pop.style.left = left + 'px';
}

function _closeAllFilterPops() {
    ['date-filter-pop', 'status-filter-pop'].forEach(id => {
        const p = document.getElementById(id);
        if (p) p.classList.add('hidden');
    });
    const dc = document.getElementById('date-filter-chev');
    const sc = document.getElementById('status-filter-chev');
    if (dc) dc.style.transform = '';
    if (sc) sc.style.transform = '';
    document.removeEventListener('click', _filterPopOutside);
}

function _filterPopOutside(e) {
    if (e.target.closest('#date-filter-pop') || e.target.closest('#date-filter-btn') ||
        e.target.closest('#status-filter-pop') || e.target.closest('#status-filter-btn')) return;
    _closeAllFilterPops();
}

// ── Período ──
function toggleDateFilterPop(e) {
    if (e) e.stopPropagation();
    const pop = document.getElementById('date-filter-pop');
    const btn = document.getElementById('date-filter-btn');
    const chev = document.getElementById('date-filter-chev');
    const isHidden = pop.classList.contains('hidden');
    _closeAllFilterPops();
    if (isHidden) {
        if (pop.parentElement !== document.body) document.body.appendChild(pop);
        _syncDateFilterUI();
        pop.classList.remove('hidden');
        _positionFilterPop(btn, pop);
        if (chev) chev.style.transform = 'rotate(180deg)';
        setTimeout(() => document.addEventListener('click', _filterPopOutside), 10);
    }
}

function _syncDateFilterUI() {
    const val = document.getElementById('filter-date-agenda').value || 'todos';
    const lbl = document.getElementById('date-filter-label');
    if (lbl) {
        if (val === 'mes') {
            const mInput = document.getElementById('filter-month-agenda');
            if (mInput && mInput.value) {
                const [y, m] = mInput.value.split('-');
                const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
                lbl.textContent = `${meses[parseInt(m,10)-1]} ${y}`;
            } else {
                lbl.textContent = 'Selecionar Mês';
            }
        } else {
            lbl.textContent = (_DATE_FILTER_META[val] || _DATE_FILTER_META.todos).label;
        }
    }
    document.querySelectorAll('#date-filter-pop .date-opt').forEach(opt => {
        const active = opt.getAttribute('data-dval') === val;
        opt.classList.toggle('bg-clinic-50', active);
        opt.classList.toggle('text-clinic-700', active);
        const check = opt.querySelector('.date-opt-check');
        if (check) check.classList.toggle('opacity-0', !active);
    });
    const mWrap = document.getElementById('date-filter-month-wrap');
    if (mWrap) mWrap.classList.toggle('hidden', val !== 'mes');
    // Realça o botão quando há filtro ativo
    const btn = document.getElementById('date-filter-btn');
    if (btn) {
        const on = val !== 'todos';
        btn.classList.toggle('border-clinic-300', on);
        btn.classList.toggle('text-clinic-600', on);
        btn.classList.toggle('bg-clinic-50', on);
    }
}

function selectDateFilter(val) {
    document.getElementById('filter-date-agenda').value = val;
    if (val === 'mes') {
        const mInput = document.getElementById('filter-month-agenda');
        if (mInput && !mInput.value) {
            const now = new Date();
            mInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        _syncDateFilterUI();
        // Mantém o popover aberto para escolher o mês
        const pop = document.getElementById('date-filter-pop');
        const btn = document.getElementById('date-filter-btn');
        if (pop && btn) _positionFilterPop(btn, pop);
        renderTable();
        return;
    }
    _syncDateFilterUI();
    _closeAllFilterPops();
    renderTable();
}

function onDateMonthChange() {
    document.getElementById('filter-date-agenda').value = 'mes';
    _syncDateFilterUI();
    renderTable();
}

// ── Status ──
function _buildStatusFilterOptions() {
    const box = document.getElementById('status-filter-opts');
    if (!box || box.dataset.built === '1') return;
    box.innerHTML = _STATUS_FILTER_OPTS.map(o => `
        <button type="button" onclick="selectStatusFilter('${o.val.replace(/'/g, "\\'")}')" data-sval="${o.val}"
            class="status-opt w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition text-left">
            <span class="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style="background:${o.color}1a;color:${o.color};">
                <i class="fas ${o.icon} text-xs"></i>
            </span>
            <span class="flex-1">${o.label}</span>
            <i class="status-opt-check fas fa-check text-clinic-500 text-xs opacity-0"></i>
        </button>`).join('');
    box.dataset.built = '1';
}

function toggleStatusFilterPop(e) {
    if (e) e.stopPropagation();
    _buildStatusFilterOptions();
    const pop = document.getElementById('status-filter-pop');
    const btn = document.getElementById('status-filter-btn');
    const chev = document.getElementById('status-filter-chev');
    const isHidden = pop.classList.contains('hidden');
    _closeAllFilterPops();
    if (isHidden) {
        if (pop.parentElement !== document.body) document.body.appendChild(pop);
        _syncStatusFilterUI();
        pop.classList.remove('hidden');
        _positionFilterPop(btn, pop);
        if (chev) chev.style.transform = 'rotate(180deg)';
        setTimeout(() => document.addEventListener('click', _filterPopOutside), 10);
    }
}

function _syncStatusFilterUI() {
    const val = document.getElementById('filter-status-agenda').value || '';
    const meta = _STATUS_FILTER_OPTS.find(o => o.val === val) || _STATUS_FILTER_OPTS[0];
    const lbl = document.getElementById('status-filter-label');
    const dot = document.getElementById('status-filter-dot');
    if (lbl) lbl.textContent = meta.label;
    if (dot) dot.style.background = meta.color;
    document.querySelectorAll('#status-filter-pop .status-opt').forEach(opt => {
        const active = opt.getAttribute('data-sval') === val;
        opt.classList.toggle('bg-slate-100', active);
        const check = opt.querySelector('.status-opt-check');
        if (check) check.classList.toggle('opacity-0', !active);
    });
    const btn = document.getElementById('status-filter-btn');
    if (btn) {
        const on = val !== '';
        btn.classList.toggle('border-clinic-300', on);
        btn.classList.toggle('bg-clinic-50', on);
    }
}

function selectStatusFilter(val) {
    document.getElementById('filter-status-agenda').value = val;
    _syncStatusFilterUI();
    _closeAllFilterPops();
    renderTable();
}
