// ─── CALENDAR & KANBAN (from index.html lines ~3133-3967) ────────────────────

let _calView = 'mensal'; // 'mensal' | 'semanal'
let _weekStart = null; // Date do domingo da semana atual

function switchCalView(view) {
    _calView = view;
    const btnM = document.getElementById('btn-cal-mensal');
    const btnS = document.getElementById('btn-cal-semanal');
    const active   = 'px-3 h-8 rounded-lg text-xs font-black uppercase tracking-wider transition bg-navy-900 text-white shadow';
    const inactive = 'px-3 h-8 rounded-lg text-xs font-black uppercase tracking-wider transition text-slate-500 hover:bg-white';
    if (btnM) btnM.className = view === 'mensal' ? active : inactive;
    if (btnS) btnS.className = view === 'semanal' ? active : inactive;
    document.getElementById('cal-view-mensal').classList.toggle('hidden', view !== 'mensal');
    document.getElementById('cal-view-semanal').classList.toggle('hidden', view !== 'semanal');
    if (view === 'semanal') {
        if (!_weekStart) _weekStart = _getSundayOf(new Date());
        renderWeekly();
    } else {
        renderCalendar();
    }
}

function calNavPrev() { if (_calView === 'semanal') { _weekStart.setDate(_weekStart.getDate() - 7); renderWeekly(); } else { changeMonth(-1); } }
function calNavNext() { if (_calView === 'semanal') { _weekStart.setDate(_weekStart.getDate() + 7); renderWeekly(); } else { changeMonth(1); } }
function calGoToday() { if (_calView === 'semanal') { _weekStart = _getSundayOf(new Date()); renderWeekly(); } else { currentDate = new Date(); renderCalendar(); } }

function _getSundayOf(date) {
    const d = new Date(date); d.setHours(0,0,0,0);
    d.setDate(d.getDate() - d.getDay());
    return d;
}

function renderWeekly() {
    const board = document.getElementById('weekly-board');
    if (!board) return;
    const DAY_NAMES = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
    const _gray = { grad: 'from-slate-100 to-gray-100', light: '#f8fafc', border: '#e2e8f0', text: '#64748b', header: '#475569' };
    const _blue = { grad: 'from-blue-50 to-slate-100', light: '#f8fafc', border: '#e2e8f0', text: '#2563eb', header: '#1d4ed8' };
    const DAY_COLORS = [
        { grad: 'from-rose-100 to-red-100', light: '#fff5f5', border: '#fecdd3', text: '#e11d48', header: '#be123c' }, // domingo
        _blue, _blue, _blue, _blue, _blue, _blue, // seg–sáb
    ];
    const todayStr = new Date().toISOString().split('T')[0];

    // Atualiza label do cabeçalho
    const sunday = new Date(_weekStart);
    const saturday = new Date(_weekStart); saturday.setDate(saturday.getDate() + 6);
    const fmt = d => d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });
    const lbl = document.getElementById('current-month-label');
    if (lbl) lbl.textContent = `${fmt(sunday)} – ${fmt(saturday)}`;

    board.innerHTML = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(_weekStart); day.setDate(day.getDate() + i);
        const dateStr = day.toISOString().split('T')[0];
        const isToday = dateStr === todayStr;
        const col = DAY_COLORS[i];
        const dayApps = appointments.filter(a => a.data === dateStr && a.status !== 'Cancelado');

        const cardsHtml = dayApps.map(a => {
            const pat = patients.find(p => p.id == a.patientId);
            const vac = vaccines.find(v => v.id == a.vaccineId);
            if (!pat || !vac) return '';
            const isDelayed = a.status === 'Agendado' && a.data < todayStr;
            const stColor = a.status === 'Aplicado' ? '#16a34a' : a.status === 'Agendado' ? '#2563eb' : '#0891b2';
            const stBg    = a.status === 'Aplicado' ? '#dcfce7' : a.status === 'Agendado' ? '#dbeafe' : '#cffafe';
            const stLabel = a.status || 'Agendado';
            const btnAgendar = a.status === 'Em negociação'
                ? permBtn('criar_agendamento', `<button onclick="event.stopPropagation();openAgendarModal(${a.id})" class="h-6 w-6 rounded-lg bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center transition shrink-0" title="Agendar"><i class="fas fa-calendar-check text-[9px]"></i></button>`)
                : '';
            const btnAplicar = a.status === 'Agendado'
                ? permBtn('aplicar', `<button onclick="event.stopPropagation();openConcluirModal(${a.id})" class="h-6 w-6 rounded-lg bg-green-500 text-white hover:bg-green-600 flex items-center justify-center transition shrink-0" title="Aplicar"><i class="fas fa-syringe text-[9px]"></i></button>`)
                : '';
            return `<div draggable="true"
                ondragstart="weeklyDragStart(event,${a.id})"
                ondragend="weeklyDragEnd(event)"
                onclick="event.stopPropagation();editRecord(${a.id})"
                class="rounded-xl border p-2.5 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all duration-150 hover:-translate-y-0.5 select-none"
                style="border-left:3px solid ${stColor};${isDelayed ? 'background:#fffbeb;border-color:#fde68a;border-left-color:#f59e0b;' : 'background:#fff;border-color:#e2e8f0;'}">
                <div class="flex items-start justify-between gap-1">
                    <div class="flex flex-col flex-1 min-w-0">
                        <p class="font-black text-navy-900 text-xs truncate">${pat.nome}</p>
                        ${pat.cpf ? `<p class="text-[9px] text-slate-400 truncate">${pat.cpf}</p>` : ''}
                    </div>
                    ${btnAgendar || btnAplicar ? `<div class="flex gap-1 shrink-0">${btnAgendar}${btnAplicar}</div>` : ''}
                </div>
                <p class="text-[10px] text-slate-400 mt-0.5 truncate">${vac.nome} · ${a.doseAtual}</p>
                <div class="flex items-center justify-between mt-0.5">
                    <div class="flex items-center gap-1">
                        ${a.hora ? `<p class="text-[10px] font-bold text-slate-500"><i class="far fa-clock mr-1"></i>${a.hora}</p>` : '<span></span>'}
                        ${isDelayed ? '<i class="fas fa-exclamation-triangle text-[9px] text-amber-500" title="Atrasado"></i>' : ''}
                    </div>
                    <span class="text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none" style="background:${stBg};color:${stColor};">${stLabel}</span>
                </div>
            </div>`;
        }).join('');

        const emptyHtml = `<div class="flex flex-col items-center justify-center py-6 opacity-40">
            <i class="fas fa-calendar-day text-2xl mb-1" style="color:${col.text};"></i>
            <p class="text-[10px] font-black uppercase" style="color:${col.text};">Sem registros</p>
        </div>`;

        return `<div class="flex flex-col rounded-2xl overflow-hidden border shadow-md transition-all duration-200 flex-1 min-w-[130px]"
            style="border-color:${col.border};${isToday ? 'box-shadow:0 0 0 2px #2563eb,0 4px 16px rgba(37,99,235,.15);' : ''}"
            ondragover="weeklyDragOver(event)"
            ondragleave="weeklyDragLeave(event)"
            ondrop="weeklyDrop(event,'${dateStr}')"
            data-date="${dateStr}">
            <div class="px-3 py-2.5 shrink-0 bg-gradient-to-br ${col.grad} flex flex-col items-center border-b" style="border-color:${col.border};">
                <span class="text-[9px] font-black uppercase tracking-widest" style="color:${col.header};opacity:0.7;">${DAY_NAMES[i]}</span>
                <span class="font-black text-xl leading-none" style="color:${col.header};">${day.getDate()}</span>
                ${isToday ? `<span class="text-[8px] font-black px-1.5 py-0.5 rounded-full mt-1 uppercase tracking-wider" style="background:${col.border};color:${col.header};">Hoje</span>` : ''}
                ${dayApps.length ? `<span class="text-[9px] font-black px-2 py-0.5 rounded-full mt-1" style="background:${col.border};color:${col.header};">${dayApps.length}</span>` : ''}
            </div>
            <div class="flex-1 overflow-y-auto p-2 space-y-2 bg-white/80" style="background:${col.light};">
                ${dayApps.length ? cardsHtml : emptyHtml}
            </div>
        </div>`;
    }).join('');

    const _setWeeklyHeight = () => {
        const rect = board.getBoundingClientRect();
        if (rect.top > 0) board.style.height = `${window.innerHeight - rect.top - 16}px`;
    };
    _setWeeklyHeight();
    window._weeklyResizeHandler && window.removeEventListener('resize', window._weeklyResizeHandler);
    window._weeklyResizeHandler = _setWeeklyHeight;
    window.addEventListener('resize', window._weeklyResizeHandler);
}

// Drag & Drop semanal
let _weeklyDragId = null;
function weeklyDragStart(e, id) { _weeklyDragId = id; e.dataTransfer.effectAllowed = 'move'; e.currentTarget.style.opacity = '0.5'; }
function weeklyDragEnd(e) { e.currentTarget.style.opacity = ''; document.querySelectorAll('#weekly-board > div').forEach(c => c.style.outline = ''); }
function weeklyDragOver(e) { e.preventDefault(); e.currentTarget.style.outline = '2px solid #2563eb'; }
function weeklyDragLeave(e) { e.currentTarget.style.outline = ''; }
let _weeklyPendingDrop = null; // { appointmentId, targetDate }

function weeklyDrop(e, dateStr) {
    e.preventDefault(); e.currentTarget.style.outline = '';
    if (!_weeklyDragId) return;
    const a = appointments.find(x => x.id == _weeklyDragId);
    _weeklyDragId = null;
    if (!a) return;

    // Mesmo dia — sem ação
    if (a.data === dateStr) return;

    // Bloqueio: lote vinculado vencido na data destino
    if (a.loteId) {
        const lote = vaccineLots.find(l => l.id == a.loteId);
        if (lote && lote.validade) {
            const exp  = new Date(lote.validade + 'T00:00:00');
            const dest = new Date(dateStr + 'T00:00:00');
            if (exp < dest) {
                const vac = vaccines.find(v => v.id == a.vaccineId);
                showNotification(
                    `Bloqueado: lote ${lote.numero} da ${vac ? vac.nome : 'vacina'} vence em ${lote.validade.split('-').reverse().join('/')} — anterior à data destino.`,
                    'error'
                );
                renderWeekly();
                return;
            }
        }
    }

    // Bloqueio de aprazamento: data destino inferior à data mínima da dose
    if (a.doseAtual && a.doseAtual.includes('ª Dose') && a.doseAtual !== '1ª Dose') {
        const doseNum = Number((a.doseAtual.match(/(\d+)/) || [])[1] || 2);
        const v       = vaccines.find(x => String(x.id) === String(a.vaccineId));
        if (v && doseNum >= 2) {
            const pat2   = patients.find(p => String(p.id) === String(a.patientId));
            const esq    = (typeof getEsquemaPaciente === 'function') ? getEsquemaPaciente(v, pat2 ? pat2.dtNasc : null) : null;
            const ints   = (esq && esq.intervalos && esq.intervalos.length)
                ? esq.intervalos
                : (v.intervalos && v.intervalos.length ? v.intervalos : (v.intervaloDias > 0 ? [v.intervaloDias] : []));
            let intervalo = ints.length
                ? (ints[doseNum - 2] != null ? ints[doseNum - 2] : ints[ints.length - 1])
                : 0;
            if (!intervalo || intervalo <= 0) intervalo = 30;
            {
                const prevDoseStr = `${doseNum - 1}ª Dose`;
                const prevApp = appointments.filter(x =>
                    String(x.patientId) === String(a.patientId) &&
                    String(x.vaccineId) === String(a.vaccineId) &&
                    String(x.id) !== String(a.id) &&
                    x.doseAtual === prevDoseStr
                ).sort((x, y) => new Date(y.data) - new Date(x.data))[0];
                if (prevApp) {
                    const minDate = new Date(prevApp.data + 'T00:00:00');
                    minDate.setDate(minDate.getDate() + intervalo);
                    const minIso = minDate.toISOString().split('T')[0];
                    if (dateStr < minIso) {
                        showNotification(
                            `Bloqueado: data mínima para ${a.doseAtual} é ${minIso.split('-').reverse().join('/')} (${intervalo} dias após a dose anterior de ${prevApp.data.split('-').reverse().join('/')}).`,
                            'error'
                        );
                        renderWeekly();
                        return;
                    }
                }
            }
        }
    }

    // Abre modal de confirmação
    const pat = patients.find(p => p.id == a.patientId);
    const vac = vaccines.find(v => v.id == a.vaccineId);
    const fmtDate = d => d.split('-').reverse().join('/');
    document.getElementById('wdrop-from').textContent = fmtDate(a.data);
    document.getElementById('wdrop-to').textContent   = fmtDate(dateStr);
    document.getElementById('wdrop-patient').textContent = pat ? pat.nome : '—';
    document.getElementById('wdrop-vaccine').textContent = vac ? `${vac.nome} · ${a.doseAtual}` : '—';
    _weeklyPendingDrop = { appointmentId: a.id, targetDate: dateStr };
    document.getElementById('modal-weekly-drop').classList.add('active');
}

function confirmWeeklyDrop() {
    if (!_weeklyPendingDrop) return;
    const { appointmentId, targetDate } = _weeklyPendingDrop;
    _weeklyPendingDrop = null;
    document.getElementById('modal-weekly-drop').classList.remove('active');
    const idx = appointments.findIndex(a => a.id == appointmentId);
    if (idx > -1) {
        appointments[idx].data = targetDate;
        if (typeof syncAppointmentMovement === 'function') syncAppointmentMovement(appointments[idx]);
        saveAll();
        renderWeekly();
        if (typeof renderCalendar === 'function') renderCalendar();
        showNotification('Agendamento movido com sucesso!', 'success');
    }
}

function cancelWeeklyDrop() {
    _weeklyPendingDrop = null;
    document.getElementById('modal-weekly-drop').classList.remove('active');
    renderWeekly();
}

function changeMonth(dir) { currentDate.setMonth(currentDate.getMonth() + dir); renderCalendar(); }
function jumpToMonth(val) { if(!val) return; const [y, m] = val.split('-'); currentDate = new Date(y, parseInt(m)-1, 1); renderCalendar(); }

// ─── MONTH/YEAR PICKER ────────────────────────────────────────────────────────
const MONTHS_PICKER = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_FULL   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let _pickerYear  = new Date().getFullYear();
let _pickerMonth = new Date().getMonth(); // usado apenas no modo semanal

function _positionPicker() {
    const picker = document.getElementById('month-year-picker');
    const btn = document.getElementById('current-month-label')?.closest('button');
    if (!picker || !btn) return;
    const rect = btn.getBoundingClientRect();
    const pickerW = 288;
    let left = rect.left + rect.width / 2 - pickerW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - pickerW - 8));
    picker.style.position = 'fixed';
    picker.style.top  = (rect.bottom + 8) + 'px';
    picker.style.left = left + 'px';
    picker.style.right = 'auto';
    picker.style.zIndex = '99999';
}

function toggleMonthYearPicker() {
    const picker = document.getElementById('month-year-picker');
    const isHidden = picker.classList.contains('hidden');
    if (isHidden) {
        // Mover picker para body para escapar de backdrop-filter/stacking contexts
        if (picker.parentElement !== document.body) {
            document.body.appendChild(picker);
        }
        if (_calView === 'semanal') {
            const ref = _weekStart || new Date();
            _pickerYear  = ref.getFullYear();
            _pickerMonth = ref.getMonth();
            _renderPickerWeekMode();
        } else {
            _pickerYear = currentDate.getFullYear();
            _renderPickerMonthMode();
        }
        _positionPicker();
        picker.classList.remove('hidden');
        setTimeout(() => document.addEventListener('click', _closPickerOutside), 10);
    } else {
        picker.classList.add('hidden');
        document.removeEventListener('click', _closPickerOutside);
    }
}

function _closPickerOutside(e) {
    const picker = document.getElementById('month-year-picker');
    const triggerBtn = document.getElementById('current-month-label')?.closest('button');
    if (picker && !picker.contains(e.target) && !triggerBtn?.contains(e.target)) {
        picker.classList.add('hidden');
        document.removeEventListener('click', _closPickerOutside);
    }
}

function pickerChangeYear(dir) {
    _pickerYear += dir;
    if (_calView === 'semanal') _renderPickerWeekMode();
    else _renderPickerMonthMode();
}

function pickerChangeMonth(dir) {
    _pickerMonth += dir;
    if (_pickerMonth < 0)  { _pickerMonth = 11; _pickerYear--; }
    if (_pickerMonth > 11) { _pickerMonth = 0;  _pickerYear++; }
    _renderPickerWeekMode();
}

function _renderPickerMonthMode() {
    document.getElementById('picker-months-grid').classList.remove('hidden');
    document.getElementById('picker-week-mode').classList.add('hidden');
    document.getElementById('picker-year-label').textContent = _pickerYear;
    const curMonth = currentDate.getMonth();
    const curYear  = currentDate.getFullYear();
    const grid = document.getElementById('picker-months-grid');
    grid.innerHTML = MONTHS_PICKER.map((m, i) => {
        const isActive = i === curMonth && _pickerYear === curYear;
        return `<button onclick="pickerSelectMonth(${i})" class="py-2 rounded-xl text-xs font-black uppercase transition ${isActive ? 'bg-clinic-600 text-white shadow-md' : 'text-slate-600 hover:bg-clinic-50 hover:text-clinic-700'}">${m}</button>`;
    }).join('');
}

function _renderPickerWeekMode() {
    document.getElementById('picker-months-grid').classList.add('hidden');
    document.getElementById('picker-week-mode').classList.remove('hidden');
    document.getElementById('picker-year-label').textContent = _pickerYear;
    document.getElementById('picker-month-label').textContent = `${MONTHS_FULL[_pickerMonth]} ${_pickerYear}`;

    const activeWeekSunday = _weekStart ? new Date(_weekStart) : null;
    const firstDay = new Date(_pickerYear, _pickerMonth, 1).getDay();
    const daysInMonth = new Date(_pickerYear, _pickerMonth + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    let cells = '';
    for (let i = 0; i < firstDay; i++) cells += '<div></div>';

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(_pickerYear, _pickerMonth, d);
        const weekSun = _getSundayOf(dateObj);
        const dateStr = dateObj.toISOString().split('T')[0];
        const isToday = dateStr === todayStr;
        const isInActiveWeek = activeWeekSunday && weekSun.getTime() === activeWeekSunday.getTime();
        const isSun = dateObj.getDay() === 0;

        let cls = 'h-7 w-7 mx-auto flex items-center justify-center rounded-lg text-[11px] font-black cursor-pointer transition ';
        if (isInActiveWeek) {
            cls += isSun ? 'bg-red-500 text-white' : 'bg-clinic-600 text-white';
        } else if (isToday) {
            cls += 'ring-2 ring-clinic-400 text-clinic-700';
        } else {
            cls += isSun ? 'text-red-400 hover:bg-red-50' : 'text-slate-600 hover:bg-clinic-50 hover:text-clinic-700';
        }

        cells += `<div onclick="pickerSelectWeek(${_pickerYear},${_pickerMonth},${d})" class="${cls}">${d}</div>`;
    }

    document.getElementById('picker-week-days-grid').innerHTML = cells;
}

function pickerSelectMonth(monthIndex) {
    currentDate = new Date(_pickerYear, monthIndex, 1);
    renderCalendar();
    document.getElementById('month-year-picker').classList.add('hidden');
    document.removeEventListener('click', _closPickerOutside);
}

function pickerSelectWeek(year, month, day) {
    const clicked = new Date(year, month, day);
    _weekStart = _getSundayOf(clicked);
    renderWeekly();
    document.getElementById('month-year-picker').classList.add('hidden');
    document.removeEventListener('click', _closPickerOutside);
}

function renderMonthYearPicker() { _renderPickerMonthMode(); }

function renderCalendar() {
    const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const year = currentDate.getFullYear(); const month = currentDate.getMonth();

    document.getElementById('current-month-label').innerText = `${MONTHS[month]} ${year}`;

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
    if (_calView === 'semanal') renderWeekly();
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
        if (typeof syncAppointmentMovement === 'function') syncAppointmentMovement(appointments[idx]);
        if (typeof syncAllLoteStatus === 'function') syncAllLoteStatus();
        saveAll(); renderCalendar(); renderTable(); renderDashboard();
        if (typeof refreshAlmoxIfActive === 'function') refreshAlmoxIfActive();
        if (typeof refreshOpenModals === 'function') refreshOpenModals();
        showNotification('Status modificado com sucesso!','success');
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
        if (typeof syncAppointmentMovement === 'function') syncAppointmentMovement(appointments[idx]);
        if (typeof syncAllLoteStatus === 'function') syncAllLoteStatus();
        saveAll(); renderCalendar(); renderTable(); renderDashboard();
        if (typeof refreshAlmoxIfActive === 'function') refreshAlmoxIfActive();
        if (typeof refreshOpenModals === 'function') refreshOpenModals();
        showNotification('Agendamento confirmado!', 'success');
    }
}

// ─── CONCLUIR VACINAÇÃO ───────────────────────────────────────────────────────
function openConcluirModal(id) {
    if (!checkPerm('aplicar')) return;
    // Bloqueio: apenas usuários com permissão 'aplicar' podem aplicar
    if (!isCurrentUserAdmin() && !hasPerm('aplicar')) {
        showNotification('Apenas usuários com permissão de aplicador podem registrar aplicações.', 'error');
        return;
    }
    pendingConcluirId = id;
    const a = appointments.find(x => x.id == id);
    if (!a) return;
    const pat = patients.find(p => p.id == a.patientId);
    const vac = vaccines.find(v => v.id == a.vaccineId);

    document.getElementById('concluir-info').innerText = pat && vac ? `${pat.nome} — ${vac.nome} (${a.doseAtual})` : '';
    // Pré-preenche com o nome do usuário logado se ele tem permissão de aplicador
    const nomeAplicador = a.aplicador || (currentUser ? currentUser.nome : '');
    document.getElementById('concluir-aplicador').value = nomeAplicador;

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
    // Bloqueio no save: apenas aplicadores podem confirmar
    if (!isCurrentUserAdmin() && !hasPerm('aplicar')) {
        showNotification('Apenas usuários com permissão de aplicador podem registrar aplicações.', 'error');
        return;
    }
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
        if (typeof syncAppointmentMovement === 'function') syncAppointmentMovement(appointments[idx]);
        if (typeof syncAllLoteStatus === 'function') syncAllLoteStatus();
        saveAll(); renderCalendar(); renderTable(); renderDashboard();
        if (typeof refreshAlmoxIfActive === 'function') refreshAlmoxIfActive();
        if (typeof refreshOpenModals === 'function') refreshOpenModals();
        if (typeof updateExpiryBadge === 'function') updateExpiryBadge();
        showNotification('Vacinação concluída com sucesso!', 'success');
    }
}

// ─── KANBAN BOARD ─────────────────────────────────────────────────────────────
function switchTableView(view) {
    tableView = view;
    const vPlan = document.getElementById('view-planilhas');
    const vKan  = document.getElementById('view-kanban');
    const statusSel = document.getElementById('filter-status-agenda');

    if (view === 'kanban') {
        if (vPlan) vPlan.classList.add('hidden');
        if (vKan)  { vKan.style.display = 'flex'; vKan.style.flexDirection = 'column'; }
        if (statusSel) statusSel.style.display = 'none';
        _kanbanPage = {};
        renderKanban();
    } else {
        if (vPlan) vPlan.classList.remove('hidden');
        if (vKan)  vKan.style.display = 'none';
        if (statusSel) statusSel.style.display = '';
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
        const PAGE_SIZE = 10;
        const allCards = allFiltered
            .filter(a => a.status === col.key)
            .sort((a, b) => (new Date(a.data) - new Date(b.data)) * dir);
        const totalPages = Math.max(1, Math.ceil(allCards.length / PAGE_SIZE));
        if (_kanbanPage[col.key] === undefined) _kanbanPage[col.key] = 0;
        if (_kanbanPage[col.key] >= totalPages) _kanbanPage[col.key] = totalPages - 1;
        const page = _kanbanPage[col.key];
        const cards = allCards.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

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
                class="kanban-card group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200 select-none"
                style="border-left:4px solid ${col.color};">
                <!-- Card header -->
                <div class="px-3 pt-2.5 pb-1.5 flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <p class="font-black text-navy-900 text-sm leading-tight truncate" title="${pat.nome}">${pat.nome}</p>
                        <p class="text-[10px] text-slate-400 font-bold mt-0.5 truncate">CPF: ${pat.cpf} · ${getAge(pat.dtNasc)} anos</p>
                    </div>
                    <div class="shrink-0 text-slate-200 group-hover:text-slate-400 transition pt-0.5">
                        <i class="fas fa-grip-vertical text-xs"></i>
                    </div>
                </div>
                <!-- Vaccine + Date + Actions row -->
                <div class="px-3 pb-2.5 flex items-start gap-2">
                    <!-- Vaccine icon -->
                    <div class="h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5" style="background:${col.light};border:1px solid ${col.border};">
                        <i class="fas fa-syringe text-[9px]" style="color:${col.text};"></i>
                    </div>
                    <!-- Vaccine name + dose -->
                    <div class="flex-1 min-w-0">
                        <p class="kanban-vac-name font-black text-slate-700 text-[11px] leading-tight truncate">${vac.nome}</p>
                        <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md" style="background:${col.light};color:${col.text};border:1px solid ${col.border};">${a.doseAtual}</span>
                    </div>
                    <!-- Date + Actions (right column) -->
                    <div class="flex flex-col items-end gap-1 shrink-0">
                        <div class="flex items-center gap-1 text-slate-500 whitespace-nowrap">
                            <i class="far fa-calendar text-[9px] text-slate-400"></i>
                            <span class="text-[10px] font-bold">${dateLabel}${a.hora ? ' · '+a.hora : ''}</span>
                            ${isDelayed ? '<span class="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded-full">!</span>' : ''}
                        </div>
                        <div class="flex items-center gap-1">
                            <a href="${waLink}" target="_blank" onclick="event.stopPropagation()" class="h-6 w-6 rounded-md bg-green-50 text-green-600 hover:bg-green-500 hover:text-white flex items-center justify-center transition text-xs" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>
                            ${permBtn('agendar', `<button onclick="editRecord(${a.id})" class="h-6 w-6 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white flex items-center justify-center transition text-xs" title="Abrir"><i class="fas fa-eye text-[10px]"></i></button>`)}
                        </div>
                    </div>
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
        const colKeyEsc = col.key.replace(/'/g, "\\'");
        const paginationHtml = totalPages > 1 ? `
            <div class="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-100 shrink-0">
                <button onclick="kanbanPageGo('${colKeyEsc}',${page - 1})" ${page === 0 ? 'disabled' : ''}
                    class="h-6 w-6 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span class="text-[11px] font-bold text-slate-500">${page + 1} / ${totalPages} <span class="text-slate-400 font-normal">(${allCards.length} total)</span></span>
                <button onclick="kanbanPageGo('${colKeyEsc}',${page + 1})" ${page >= totalPages - 1 ? 'disabled' : ''}
                    class="h-6 w-6 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>` : '';

        return `<div class="kanban-col flex flex-col rounded-2xl overflow-hidden shadow-md border border-slate-200/60 transition-all duration-200" style="height:100%;flex:1 1 0;min-width:220px;"
            ondragover="kanbanDragOver(event)"
            ondragleave="kanbanDragLeave(event)"
            ondrop="kanbanDrop(event,'${colKeyEsc}')"
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
                    <span class="h-6 min-w-6 px-1.5 bg-white/25 text-white font-black text-xs rounded-full flex items-center justify-center border border-white/30">${allCards.length}</span>
                    <i class="fas ${sortIconClass} text-white/70 text-xs"></i>
                </div>
            </div>
            <!-- Pagination bar -->
            ${paginationHtml}
            <!-- Drop zone body -->
            <div class="kanban-col-body flex-1 overflow-y-auto p-3 space-y-3 bg-white/70 backdrop-blur-sm">
                ${cards.length ? cardsHtml : emptyHtml}
            </div>
        </div>`;
    }).join('');
}

function kanbanToggleSort() {
    _kanbanSortDir = _kanbanSortDir === 'asc' ? 'desc' : 'asc';
    renderKanban();
}

function kanbanPageGo(colKey, newPage) {
    _kanbanPage[colKey] = newPage;
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
            if (typeof syncAppointmentMovement === 'function') syncAppointmentMovement(appointments[idx]);
            if (typeof syncAllLoteStatus === 'function') syncAllLoteStatus();
            saveAll(); renderCalendar(); renderDashboard();
            renderKanban();
            if (typeof refreshAlmoxIfActive === 'function') refreshAlmoxIfActive();
            if (typeof refreshOpenModals === 'function') refreshOpenModals();
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
    const btnManage = document.getElementById('btn-kanban-manage-reasons');
    if (btnManage) btnManage.classList.toggle('hidden', !(isCurrentUserAdmin() || hasPerm('criar_agendamento')));
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
        if (typeof syncAppointmentMovement === 'function') syncAppointmentMovement(appointments[idx]);
        if (typeof syncAllLoteStatus === 'function') syncAllLoteStatus();
        saveAll(); renderCalendar(); renderDashboard();
        renderKanban();
        if (typeof refreshAlmoxIfActive === 'function') refreshAlmoxIfActive();
        if (typeof refreshOpenModals === 'function') refreshOpenModals();
        showNotification('Atendimento cancelado.', 'info');
    }
}
