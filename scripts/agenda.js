// ─── CALENDAR & KANBAN (from index.html lines ~3133-3967) ────────────────────

function changeMonth(dir) { currentDate.setMonth(currentDate.getMonth() + dir); renderCalendar(); }
function jumpToMonth(val) { if(!val) return; const [y, m] = val.split('-'); currentDate = new Date(y, parseInt(m)-1, 1); renderCalendar(); }

function renderCalendar() {
    const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const year = currentDate.getFullYear(); const month = currentDate.getMonth();

    document.getElementById('current-month-label').innerText = `${MONTHS[month]} ${year}`;
    document.getElementById('agenda-month-picker').value = `${year}-${String(month+1).padStart(2,'0')}`;

    const first = new Date(year, month, 1).getDay(); const days = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    const body = document.getElementById('calendar-body');
    body.innerHTML = '';
    for (let i = 0; i < first; i++) body.appendChild(Object.assign(document.createElement('div'), {className: 'min-h-[100px]'}));

    for (let d = 1; d <= days; d++) {
        const dateObj = new Date(year, month, d);
        const isSunday = dateObj.getDay() === 0;
        const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isHoliday = holidays.includes(dateStr);
        const dayApps = appointments.filter(a => a.data === dateStr);

        const cell = document.createElement('div');

        if (isSunday) {
            cell.className = `min-h-[100px] rounded-lg border p-1.5 bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed flex flex-col`;
            cell.innerHTML = `<div class="text-right text-xs font-black text-slate-300 mb-1">${d}</div><div class="text-[9px] font-black text-slate-300 mt-auto w-full text-center">DOMINGO</div>`;
        } else {
            cell.className = `min-h-[100px] rounded-lg border p-1.5 bg-white hover:border-clinic-400 hover:shadow-md transition cursor-pointer flex flex-col relative ${dateStr === todayStr ? 'border-clinic-500 ring-2 ring-clinic-300' : 'border-slate-200'}`;
            cell.onclick = () => openDayModal(dateStr, d, month, year);

            if (isHoliday) {
                cell.innerHTML = `<div class="text-right text-xs font-black mb-1 ${dateStr===todayStr?'text-clinic-600':'text-slate-400'}">${d}</div><div class="text-[9px] font-black text-red-500 bg-red-50 text-center rounded py-1 mt-auto border border-red-200 shadow-sm">FERIADO</div>`;
            } else {
                const emAndamento = dayApps.filter(a => a.status === 'Em negociação').length;
                const agendados = dayApps.filter(a => a.status === 'Agendado').length;
                const aplicados = dayApps.filter(a => a.status === 'Aplicado').length;
                const cancelados = dayApps.filter(a => a.status === 'Cancelado').length;

                let summary = '';
                if(emAndamento) summary += `<div class="text-[9px] font-black text-cyan-700 bg-cyan-50 border border-cyan-100 rounded px-1 mb-0.5 truncate shadow-sm">${emAndamento} NEGOCIANDO</div>`;
                if(agendados)   summary += `<div class="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-100 rounded px-1 mb-0.5 truncate shadow-sm">${agendados} AGENDADO(S)</div>`;
                if(aplicados)   summary += `<div class="text-[9px] font-black text-green-700 bg-green-50 border border-green-100 rounded px-1 mb-0.5 truncate shadow-sm">${aplicados} APLICADO(S)</div>`;
                if(cancelados)  summary += `<div class="text-[9px] font-black text-red-700 bg-red-50 border border-red-100 rounded px-1 mb-0.5 truncate shadow-sm">${cancelados} CANCELADO(S)</div>`;

                cell.innerHTML = `<div class="text-right text-xs font-black mb-1 ${dateStr===todayStr?'text-clinic-600':'text-slate-400'}">${d}</div><div class="flex flex-col gap-[1px]">${summary}</div>`;
            }
        }
        body.appendChild(cell);
    }
}

// ─── MODAL DO DIA & FERIADOS ──────────────────────────────────────────────────
function openDayModal(dateStr, d, month, year) {
    selectedDayDate = dateStr;
    const formattedDate = `${String(d).padStart(2,'0')}/${String(month + 1).padStart(2,'0')}/${year}`;
    document.getElementById('day-details-date').innerText = formattedDate;

    const isHoliday = holidays.includes(dateStr);
    const holidayBtnContainer = document.getElementById('holiday-btn-container');
    const list = document.getElementById('day-appointments-list');
    const btnAgendarDia = document.getElementById('btn-agendar-dia');

    if (isHoliday) {
        holidayBtnContainer.innerHTML = permBtn('definir_feriados', `<button onclick="toggleHoliday('${dateStr}')" class="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase hover:bg-slate-300 transition shadow-sm"><i class="fas fa-calendar-check mr-1"></i> Remover Feriado</button>`);
        list.innerHTML = `<div class="text-center py-10"><i class="fas fa-cocktail text-4xl text-red-200 mb-3"></i><p class="text-red-500 font-black uppercase">Dia marcado como Feriado</p></div>`;
        btnAgendarDia.style.display = 'none';
    } else {
        holidayBtnContainer.innerHTML = permBtn('definir_feriados', `<button onclick="toggleHoliday('${dateStr}')" class="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase hover:bg-red-200 transition shadow-sm"><i class="fas fa-calendar-times mr-1"></i> Marcar Feriado</button>`);
        btnAgendarDia.style.display = (isCurrentUserAdmin() || hasPerm('agendar')) ? 'block' : 'none';

        const dayApps = appointments.filter(a => a.data === dateStr);
        if (dayApps.length === 0) {
            list.innerHTML = `<p class="text-center text-slate-400 text-sm py-8 font-bold">Nenhum agendamento neste dia.</p>`;
        } else {
            list.innerHTML = dayApps.map(a => {
                const pat = patients.find(p=>p.id==a.patientId); const vac = vaccines.find(v=>v.id==a.vaccineId);
                if(!pat || !vac) return '';

                const isDelayed = dateStr < new Date().toISOString().split('T')[0] && a.status === 'Agendado';
                let stClass = a.status==='Aplicado'?'bg-green-50 border-green-200':a.status==='Cancelado'?'bg-red-50 border-red-200':a.status==='Em negociação'?'bg-cyan-50 border-cyan-200':isDelayed?'bg-yellow-50 border-yellow-200':'bg-white border-blue-200';
                let stBadgeClass = a.status==='Aplicado'?'bg-green-100 text-green-700':a.status==='Cancelado'?'bg-red-100 text-red-700':a.status==='Em negociação'?'bg-cyan-100 text-cyan-700':isDelayed?'bg-yellow-100 text-yellow-700':'bg-blue-100 text-blue-700';

                return `
                <div class="p-4 rounded-xl border shadow-sm ${stClass} flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:shadow-md">
                    <div>
                        <div class="flex items-center gap-3 mb-1">
                            <h4 class="font-black text-navy-900">${pat.nome}</h4>
                            <a href="https://wa.me/55${formatWa(pat.contato)}" target="_blank" title="Falar no WhatsApp" class="text-green-500 hover:text-green-700 transition"><i class="fab fa-whatsapp text-lg"></i></a>
                            <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase ${stBadgeClass}">${isDelayed ? 'Atrasado' : a.status}</span>
                        </div>
                        <p class="text-[11px] text-slate-500 mb-2 font-bold">Idade: ${getAge(pat.dtNasc)} | CPF: ${pat.cpf}${a.hora ? ' | <i class="fas fa-clock mr-1"></i>'+a.hora : ''}</p>
                        <p class="text-xs font-black text-navy-800 bg-white/50 inline-block px-2 py-1 rounded border border-white"><i class="fas fa-syringe text-clinic-600 mr-1"></i> ${vac.nome} - ${a.doseAtual}</p>
                    </div>
                    <div class="flex gap-2 w-full md:w-auto">
                        ${a.status === 'Agendado' ? permBtn('aplicar', `<button onclick="openConcluirModal(${a.id})" class="flex-1 md:flex-none px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-[10px] font-black uppercase shadow-md transition"><i class="fas fa-check mr-1"></i> Aplicar</button>`) : ''}
                        ${a.status === 'Em negociação' ? permBtn('criar_agendamento', `<button onclick="openAgendarModal(${a.id})" class="flex-1 md:flex-none px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-[10px] font-black uppercase shadow-md transition"><i class="fas fa-calendar-check mr-1"></i> Agendar</button>`) : ''}
                        ${permBtn('agendar', `<button onclick="editRecord(${a.id})" class="flex-1 md:flex-none px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-[10px] font-black uppercase shadow-sm transition"><i class="fas fa-pen mr-1"></i> Abrir</button>`)}
                    </div>
                </div>`;
            }).join('');
        }
    }
    document.getElementById('modal-day-details').classList.add('active');
}

function toggleHoliday(dateStr) {
    if (!checkPerm('definir_feriados')) return;
    const idx = holidays.indexOf(dateStr);
    if(idx > -1) {
        holidays.splice(idx, 1);
        showNotification('Feriado removido!', 'success');
    } else {
        if(appointments.some(a => a.data === dateStr)) {
            showNotification('Bloqueio: Existem agendamentos neste dia. Cancele-os antes de marcar como feriado.', 'error');
            return;
        }
        holidays.push(dateStr);
        showNotification('Dia marcado como feriado.', 'warning');
    }
    saveAll(); renderCalendar();
    const [y, m, d] = dateStr.split('-');
    openDayModal(dateStr, d, parseInt(m)-1, y);
}

function openRecordModalWithDate() {
    closeModals(); openRecordModal();
    if (selectedDayDate) document.getElementById('reg-data').value = selectedDayDate;
}

function setQuickStatus(id, status) {
    let idx = appointments.findIndex(a=>a.id==id);
    if(idx > -1) {
        appointments[idx].status = status;
        saveAll(); renderCalendar(); renderTable(); renderDashboard();
        showNotification('Status modificado com sucesso!','success');
        if(selectedDayDate) {
            const [y, m, d] = selectedDayDate.split('-');
            openDayModal(selectedDayDate, d, parseInt(m)-1, y);
        }
    }
}

// ─── AGENDAR (de "Em negociação" → "Agendado") ───────────────────────────────
function openAgendarModal(id) {
    if (!checkPerm('agendar')) return;
    pendingAgendarId = id;
    const a = appointments.find(x => x.id == id);
    if (!a) return;
    const pat = patients.find(p => p.id == a.patientId);
    const vac = vaccines.find(v => v.id == a.vaccineId);

    document.getElementById('agendar-info').innerText = pat && vac ? `${pat.nome} — ${vac.nome} (${a.doseAtual})` : '';
    const dataInput = document.getElementById('agendar-data');
    dataInput.value = a.data || '';
    document.getElementById('agendar-data-erro').classList.add('hidden');
    document.getElementById('agendar-data-spacer').style.display = 'block';
    checkAgendarData();
    document.getElementById('modal-agendar').classList.add('active');
}

function checkAgendarData() {
    const val = document.getElementById('agendar-data').value;
    const btn = document.getElementById('btn-confirm-agendar');
    const ok = val.length > 0;
    btn.disabled = !ok;
    btn.className = ok
        ? 'flex-1 bg-blue-600 text-white font-black py-3 rounded-xl uppercase text-xs transition hover:bg-blue-700 cursor-pointer shadow-md'
        : 'flex-1 bg-blue-200 text-blue-400 font-black py-3 rounded-xl uppercase text-xs transition cursor-not-allowed';
}

function confirmAgendar() {
    const data = document.getElementById('agendar-data').value;
    if (!data) {
        document.getElementById('agendar-data-erro').classList.remove('hidden');
        document.getElementById('agendar-data-spacer').style.display = 'none';
        return;
    }
    if (holidays.includes(data)) {
        showNotification('Bloqueio: O dia selecionado está marcado como feriado.', 'error');
        return;
    }
    const dObj = new Date(data + 'T00:00:00');
    if (dObj.getDay() === 0) {
        showNotification('Bloqueio: Agendamentos aos domingos não são permitidos.', 'error');
        return;
    }
    if (!pendingAgendarId) return;
    const idx = appointments.findIndex(a => a.id == pendingAgendarId);
    if (idx > -1) {
        // Se o agendamento já tem lote vinculado, a reserva precisa de disponível > 0
        const apt = appointments[idx];
        if (apt.loteId && typeof getLoteDisponivelParaAgendamento === 'function') {
            const dispLivre = getLoteDisponivelParaAgendamento(Number(apt.loteId), Number(pendingAgendarId));
            if (dispLivre <= 0) {
                const loteRef = vaccineLots.find(l => l.id == apt.loteId);
                showNotification(`Não é possível reservar: o lote ${loteRef ? loteRef.numero : ''} está sem estoque disponível.`, 'error');
                return;
            }
        }
        appointments[idx].status = 'Agendado';
        appointments[idx].data = data;
        pendingAgendarId = null;
        document.getElementById('modal-agendar').classList.remove('active');
        if (typeof syncAllLoteStatus === 'function') syncAllLoteStatus();
        saveAll(); renderCalendar(); renderTable(); renderDashboard();
        if (typeof refreshAlmoxIfActive === 'function') refreshAlmoxIfActive();
        showNotification('Agendamento confirmado!', 'success');
        if (selectedDayDate && tableView !== 'kanban') {
            const [y, m, d] = selectedDayDate.split('-');
            openDayModal(selectedDayDate, d, parseInt(m) - 1, y);
        }
    }
}

// ─── CONCLUIR VACINAÇÃO ───────────────────────────────────────────────────────
function openConcluirModal(id) {
    if (!checkPerm('aplicar')) return;
    pendingConcluirId = id;
    const a = appointments.find(x => x.id == id);
    if (!a) return;
    const pat = patients.find(p => p.id == a.patientId);
    const vac = vaccines.find(v => v.id == a.vaccineId);

    document.getElementById('concluir-info').innerText = pat && vac ? `${pat.nome} — ${vac.nome} (${a.doseAtual})` : '';
    document.getElementById('concluir-aplicador').value = a.aplicador || '';

    // Populate lote select with open lots for this vaccine
    const loteSel = document.getElementById('concluir-lote');
    loteSel.innerHTML = '<option value="">Selecione o lote...</option>';
    const openLots = vaccineLots.filter(l => l.vaccineId == a.vaccineId && (l.status === 'aberto' || l.id == a.loteId)).sort((a, b) => new Date(a.validade) - new Date(b.validade));
    openLots.forEach(l => {
        const disp = (typeof getLoteDisponivelParaAgendamento === 'function') ? getLoteDisponivelParaAgendamento(l.id, a.id) : null;
        const opt = document.createElement('option');
        opt.value = l.id;
        const dispStr = disp != null ? ` (disp: ${Math.max(0, disp)})` : '';
        opt.textContent = `Lote ${l.numero} — Val: ${l.validade.split('-').reverse().join('/')}${dispStr}`;
        opt.dataset.numero = l.numero;
        opt.dataset.validade = l.validade;
        if (disp != null && disp <= 0 && l.id != a.loteId) { opt.disabled = true; opt.textContent += ' — sem estoque'; }
        if (l.id == a.loteId) opt.selected = true;
        loteSel.appendChild(opt);
    });

    document.getElementById('concluir-lote-erro').classList.add('hidden');
    document.getElementById('concluir-lote-spacer').style.display = 'block';
    checkConcluirLote();
    document.getElementById('modal-concluir').classList.add('active');
}

function checkConcluirLote() {
    const sel = document.getElementById('concluir-lote');
    const loteVal = sel.value;
    const aplicadorVal = document.getElementById('concluir-aplicador').value.trim();
    const btn = document.getElementById('btn-confirm-concluir');
    const erroVencido = document.getElementById('concluir-lote-vencido-erro');

    // Verifica vencimento e proximidade com base na data do agendamento
    const avisoVencendo = document.getElementById('concluir-lote-vencendo-aviso');
    let loteVencido = false;
    let loteVencendo = false;
    if (loteVal) {
        const lot = vaccineLots.find(l => l.id == loteVal);
        if (lot && lot.validade) {
            const apmt = appointments.find(a => a.id == pendingConcluirId);
            const refDate = apmt && apmt.data ? new Date(apmt.data + 'T00:00:00') : new Date();
            refDate.setHours(0,0,0,0);
            const twoMonthsRef = new Date(refDate); twoMonthsRef.setMonth(twoMonthsRef.getMonth() + 2);
            const exp = new Date(lot.validade + 'T00:00:00');
            loteVencido  = exp < refDate;
            loteVencendo = !loteVencido && exp <= twoMonthsRef;
        }
    }

    if (loteVencido) {
        erroVencido.classList.remove('hidden');
        if (avisoVencendo) avisoVencendo.classList.add('hidden');
        sel.classList.add('border-red-400');
        btn.disabled = true;
        btn.className = 'flex-1 bg-red-200 text-red-400 font-black py-3 rounded-xl uppercase text-xs transition cursor-not-allowed';
        return;
    }

    erroVencido.classList.add('hidden');
    if (avisoVencendo) avisoVencendo.classList.toggle('hidden', !loteVencendo);
    sel.classList.remove('border-red-400');

    const ok = loteVal.length > 0 && aplicadorVal.length > 0;
    btn.disabled = !ok;
    btn.className = ok
        ? 'flex-1 bg-green-600 text-white font-black py-3 rounded-xl uppercase text-xs transition hover:bg-green-700 cursor-pointer shadow-md'
        : 'flex-1 bg-green-200 text-green-400 font-black py-3 rounded-xl uppercase text-xs transition cursor-not-allowed';
}

function confirmConcluir() {
    const loteId = document.getElementById('concluir-lote').value;
    const aplicador = document.getElementById('concluir-aplicador').value.trim();
    if (!loteId || !aplicador) {
        document.getElementById('concluir-lote-erro').classList.remove('hidden');
        document.getElementById('concluir-lote-spacer').style.display = 'none';
        return;
    }
    if (!pendingConcluirId) return;
    const idx = appointments.findIndex(a => a.id == pendingConcluirId);
    if (idx > -1) {
        // Bloqueio de estoque: o lote precisa de disponível > 0 (desconsiderando este próprio agendamento)
        if (typeof getLoteDisponivelParaAgendamento === 'function') {
            const dispLivre = getLoteDisponivelParaAgendamento(Number(loteId), Number(pendingConcluirId));
            if (dispLivre <= 0) {
                const loteRef = vaccineLots.find(l => l.id == loteId);
                showNotification(`Estoque insuficiente no lote ${loteRef ? loteRef.numero : ''}. Registre uma entrada ou selecione outro lote.`, 'error');
                return;
            }
        }
        const lot = vaccineLots.find(l => l.id == loteId);
        appointments[idx].status = 'Aplicado';
        appointments[idx].loteId = Number(loteId);
        appointments[idx].lote = lot ? lot.numero.toUpperCase() : '';
        appointments[idx].aplicador = aplicador.toUpperCase();
        pendingConcluirId = null;
        document.getElementById('modal-concluir').classList.remove('active');
        if (typeof syncAllLoteStatus === 'function') syncAllLoteStatus();
        saveAll(); renderCalendar(); renderTable(); renderDashboard();
        if (typeof refreshAlmoxIfActive === 'function') refreshAlmoxIfActive();
        if (typeof updateExpiryBadge === 'function') updateExpiryBadge();
        showNotification('Vacinação concluída com sucesso!', 'success');
        if (selectedDayDate) {
            const [y, m, d] = selectedDayDate.split('-');
            openDayModal(selectedDayDate, d, parseInt(m) - 1, y);
        }
    }
}

// ─── KANBAN BOARD ─────────────────────────────────────────────────────────────
function switchTableView(view) {
    tableView = view;
    const vPlan = document.getElementById('view-planilhas');
    const vKan  = document.getElementById('view-kanban');
    const btnPl = document.getElementById('btn-view-planilhas');
    const btnKn = document.getElementById('btn-view-kanban');
    const statusSel = document.getElementById('filter-status-agenda');

    if (view === 'kanban') {
        vPlan.classList.add('hidden');
        vKan.classList.remove('hidden');
        if (statusSel) statusSel.closest('select') && (statusSel.style.display = 'none');
        btnPl.className = 'flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition shadow border border-slate-300 bg-white text-slate-500 hover:bg-slate-50';
        btnKn.className = 'flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition shadow border border-navy-800 bg-navy-900 text-white';
        renderKanban();
    } else {
        vPlan.classList.remove('hidden');
        vKan.classList.add('hidden');
        if (statusSel) statusSel.style.display = '';
        btnPl.className = 'flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition shadow border border-navy-800 bg-navy-900 text-white';
        btnKn.className = 'flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition shadow border border-slate-300 bg-white text-slate-500 hover:bg-slate-50';
        renderTable();
    }
}

function _getKanbanFiltered() {
    const search = normalizeStr(document.getElementById('filter-search-agenda').value);
    const dateFilter = document.getElementById('filter-date-agenda').value;
    const monthFilter = document.getElementById('filter-month-agenda').value;
    const filterVendedor = document.getElementById('filter-vendedor-agenda').value;
    const filterAplicador = document.getElementById('filter-aplicador-agenda').value;
    const todayObj = new Date();
    const todayStr = todayObj.toISOString().split('T')[0];
    const startOfWeek = getStartOfWeek(todayObj).toISOString().split('T')[0];
    const endOfWeek = new Date(new Date(startOfWeek).setDate(new Date(startOfWeek).getDate()+6)).toISOString().split('T')[0];

    return appointments.filter(a => {
        const pat = patients.find(p=>p.id==a.patientId);
        const vac = vaccines.find(v=>v.id==a.vaccineId);
        if (!pat || !vac) return false;
        const matchSearch = normalizeStr(pat.nome).includes(search) || normalizeStr(pat.cpf).includes(search);
        const matchVendedor = !filterVendedor || a.vendedor === filterVendedor;
        const matchAplicador = !filterAplicador || a.aplicador === filterAplicador;
        let matchDate = true;
        if (dateFilter === 'hoje') matchDate = a.data === todayStr;
        else if (dateFilter === 'semana') matchDate = a.data >= startOfWeek && a.data <= endOfWeek;
        else if (dateFilter === 'mes' && monthFilter) matchDate = a.data.startsWith(monthFilter);
        return matchSearch && matchDate && matchVendedor && matchAplicador;
    });
}

function renderKanban() {
    const board = document.getElementById('kanban-board');
    if (!board) return;
    _populateTableColabDropdowns();
    const todayStr = new Date().toISOString().split('T')[0];
    const allFiltered = _getKanbanFiltered();
    const dir = _kanbanSortDir === 'asc' ? 1 : -1;

    const columns = [
        { key: 'Em negociação', label: 'Em Negociação', icon: 'fa-comments', color: '#0891b2', light: '#ecfeff', border: '#a5f3fc', text: '#0e7490', gradFrom: '#0891b2', gradTo: '#0e7490' },
        { key: 'Agendado',      label: 'Agendado',      icon: 'fa-calendar-check', color: '#2563eb', light: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', gradFrom: '#2563eb', gradTo: '#1d4ed8' },
        { key: 'Aplicado',      label: 'Aplicado',      icon: 'fa-syringe', color: '#16a34a', light: '#f0fdf4', border: '#bbf7d0', text: '#15803d', gradFrom: '#16a34a', gradTo: '#15803d' },
        { key: 'Cancelado',     label: 'Cancelado',     icon: 'fa-ban', color: '#dc2626', light: '#fff1f2', border: '#fecdd3', text: '#b91c1c', gradFrom: '#dc2626', gradTo: '#b91c1c' },
    ];

    board.innerHTML = columns.map(col => {
        const cards = allFiltered
            .filter(a => a.status === col.key)
            .sort((a, b) => (new Date(a.data) - new Date(b.data)) * dir);

        const cardsHtml = cards.map(a => {
            const pat = patients.find(p=>p.id==a.patientId);
            const vac = vaccines.find(v=>v.id==a.vaccineId);
            if (!pat || !vac) return '';
            const isDelayed = a.data < todayStr && a.status === 'Agendado';
            const dateLabel = a.data ? a.data.split('-').reverse().join('/') : '—';
            const waLink = `https://wa.me/55${formatWa(pat.contato)}`;
            return `<div
                draggable="true"
                ondragstart="kanbanDragStart(event,${a.id})"
                ondragend="kanbanDragEnd(event)"
                class="kanban-card group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200 select-none"
                style="border-left:4px solid ${col.color};">
                <!-- Card header -->
                <div class="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <p class="font-black text-navy-900 text-sm leading-tight truncate" title="${pat.nome}">${pat.nome}</p>
                        <p class="text-[10px] text-slate-400 font-bold mt-0.5 truncate">CPF: ${pat.cpf} · ${getAge(pat.dtNasc)} anos</p>
                    </div>
                    <div class="shrink-0 flex flex-col items-center gap-0.5 text-slate-200 group-hover:text-slate-400 transition pt-0.5">
                        <i class="fas fa-grip-vertical text-xs"></i>
                    </div>
                </div>
                <!-- Vaccine -->
                <div class="px-4 pb-2 flex items-center gap-2">
                    <div class="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style="background:${col.light};border:1px solid ${col.border};">
                        <i class="fas fa-syringe text-[10px]" style="color:${col.text};"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="font-black text-slate-700 text-xs truncate leading-tight">${vac.nome}</p>
                        <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md" style="background:${col.light};color:${col.text};border:1px solid ${col.border};">${a.doseAtual}</span>
                    </div>
                </div>
                <!-- Date -->
                <div class="px-4 pb-3 flex items-center gap-1.5">
                    <i class="far fa-calendar text-[10px] text-slate-400"></i>
                    <span class="text-[11px] font-bold text-slate-500">${dateLabel}${a.hora ? ' · '+a.hora : ''}</span>
                    ${isDelayed ? '<span class="ml-1 text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full uppercase">Atrasado</span>' : ''}
                </div>
                <!-- Actions -->
                <div class="px-3 pb-3 flex items-center gap-1.5 border-t border-slate-100 pt-2 mt-0">
                    <a href="${waLink}" target="_blank" onclick="event.stopPropagation()" class="h-7 w-7 rounded-lg bg-green-50 text-green-600 hover:bg-green-500 hover:text-white flex items-center justify-center transition text-xs shrink-0" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>
                    ${permBtn('agendar', `<button onclick="editRecord(${a.id})" class="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white flex items-center justify-center transition text-xs shrink-0" title="Abrir"><i class="fas fa-eye text-[11px]"></i></button>`)}
                    ${a.status === 'Em negociação' ? permBtn('criar_agendamento', `<button onclick="openAgendarModal(${a.id})" class="h-7 w-7 rounded-lg bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center transition text-xs shrink-0" title="Agendar"><i class="fas fa-calendar-check text-[11px]"></i></button>`) : ''}
                    ${a.status === 'Agendado' ? permBtn('aplicar', `<button onclick="openConcluirModal(${a.id})" class="h-7 w-7 rounded-lg bg-green-500 text-white hover:bg-green-600 flex items-center justify-center transition text-xs shrink-0" title="Aplicar"><i class="fas fa-syringe text-[11px]"></i></button>`) : ''}
                </div>
            </div>`;
        }).join('');

        const emptyHtml = `<div class="flex flex-col items-center justify-center py-10 text-center opacity-60">
            <div class="h-12 w-12 rounded-full flex items-center justify-center mb-2" style="background:${col.light};">
                <i class="fas ${col.icon} text-lg" style="color:${col.color};"></i>
            </div>
            <p class="text-[11px] font-black uppercase tracking-wider" style="color:${col.text};">Sem registros</p>
        </div>`;

        const sortIconClass = _kanbanSortDir === 'asc' ? 'fa-sort-amount-down-alt' : 'fa-sort-amount-up-alt';

        return `<div class="kanban-col flex flex-col rounded-2xl overflow-hidden shadow-md border border-slate-200/60 min-w-[280px] w-[280px] shrink-0 transition-all duration-200"
            ondragover="kanbanDragOver(event)"
            ondragleave="kanbanDragLeave(event)"
            ondrop="kanbanDrop(event,'${col.key}')"
            data-col="${col.key}">
            <!-- Column Header -->
            <div class="px-4 py-3 flex items-center justify-between shrink-0 cursor-pointer select-none" style="background:linear-gradient(135deg,${col.gradFrom},${col.gradTo});" onclick="kanbanToggleSort()">
                <div class="flex items-center gap-2">
                    <div class="h-7 w-7 bg-white/20 rounded-lg flex items-center justify-center border border-white/30">
                        <i class="fas ${col.icon} text-white text-xs"></i>
                    </div>
                    <span class="font-black text-white text-xs uppercase tracking-wider">${col.label}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="h-6 min-w-6 px-1.5 bg-white/25 text-white font-black text-xs rounded-full flex items-center justify-center border border-white/30">${cards.length}</span>
                    <i class="fas ${sortIconClass} text-white/70 text-xs"></i>
                </div>
            </div>
            <!-- Drop zone body -->
            <div class="kanban-col-body flex-1 overflow-y-auto p-3 space-y-3 bg-white/70 backdrop-blur-sm" style="max-height:560px;">
                ${cards.length ? cardsHtml : emptyHtml}
            </div>
        </div>`;
    }).join('');
}

function kanbanToggleSort() {
    _kanbanSortDir = _kanbanSortDir === 'asc' ? 'desc' : 'asc';
    renderKanban();
}

function kanbanDragStart(event, id) {
    _kanbanDragId = id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setTimeout(() => { event.target.style.opacity = '0.45'; event.target.style.transform = 'scale(0.97)'; }, 0);
}

function kanbanDragEnd(event) {
    event.target.style.opacity = '';
    event.target.style.transform = '';
    document.querySelectorAll('.kanban-col').forEach(c => {
        c.style.boxShadow = '';
        c.style.borderColor = '';
        c.style.background = '';
    });
}

function kanbanDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const col = event.currentTarget;
    col.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.35)';
}

function kanbanDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
        event.currentTarget.style.boxShadow = '';
    }
}

function kanbanDrop(event, targetStatus) {
    event.preventDefault();
    event.currentTarget.style.boxShadow = '';
    const id = _kanbanDragId;
    if (!id) return;
    const a = appointments.find(x => x.id == id);
    if (!a || a.status === targetStatus) return;

    if (targetStatus === 'Agendado') {
        if (!checkPerm('agendar')) return;
        openAgendarModal(id);
    } else if (targetStatus === 'Aplicado') {
        if (!checkPerm('aplicar')) return;
        openConcluirModal(id);
    } else if (targetStatus === 'Cancelado') {
        openKanbanCancelModal(id);
    } else {
        const idx = appointments.findIndex(x => x.id == id);
        if (idx > -1) {
            appointments[idx].status = targetStatus;
            if (typeof syncAllLoteStatus === 'function') syncAllLoteStatus();
            saveAll(); renderCalendar(); renderDashboard();
            renderKanban();
            if (typeof refreshAlmoxIfActive === 'function') refreshAlmoxIfActive();
            showNotification('Status atualizado!', 'success');
        }
    }
    _kanbanDragId = null;
}

// ─── KANBAN CANCEL MODAL ──────────────────────────────────────────────────────
function openKanbanCancelModal(id) {
    _kanbanPendingCancelId = id;
    const a = appointments.find(x => x.id == id);
    if (!a) return;
    const pat = patients.find(p=>p.id==a.patientId);
    const vac = vaccines.find(v=>v.id==a.vaccineId);
    const info = document.getElementById('kanban-cancel-info');
    if (info) info.textContent = pat && vac ? `${pat.nome} — ${vac.nome} (${a.doseAtual})` : '';
    const sel = document.getElementById('kanban-cancel-reason');
    sel.innerHTML = '<option value="">Selecione o motivo...</option>' + cancelReasons.map(r=>`<option value="${r}">${r}</option>`).join('');
    document.getElementById('kanban-cancel-err').classList.add('hidden');
    document.getElementById('modal-kanban-cancel').classList.add('active');
}

function closeKanbanCancelModal() {
    _kanbanPendingCancelId = null;
    document.getElementById('modal-kanban-cancel').classList.remove('active');
}

function confirmKanbanCancel() {
    const reason = document.getElementById('kanban-cancel-reason').value;
    if (!reason) {
        document.getElementById('kanban-cancel-err').classList.remove('hidden');
        return;
    }
    const idx = appointments.findIndex(x => x.id == _kanbanPendingCancelId);
    if (idx > -1) {
        appointments[idx].status = 'Cancelado';
        appointments[idx].motivoCancelamento = reason;
        closeKanbanCancelModal();
        if (typeof syncAllLoteStatus === 'function') syncAllLoteStatus();
        saveAll(); renderCalendar(); renderDashboard();
        renderKanban();
        if (typeof refreshAlmoxIfActive === 'function') refreshAlmoxIfActive();
        showNotification('Atendimento cancelado.', 'info');
    }
}
