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

function toggleMonthFilter() {
    const sel = document.getElementById('filter-date-agenda').value;
    const mInput = document.getElementById('filter-month-agenda');
    if(sel === 'mes') {
        mInput.classList.remove('hidden');
        if(!mInput.value) {
            const now = new Date();
            mInput.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        }
    } else {
        mInput.classList.add('hidden');
    }
    renderTable();
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
