// ─── PATIENT MANAGEMENT (from index.html lines ~3969-4491) ───────────────────

function renderPatients() {
    const btnNovoPac = document.getElementById('btn-novo-paciente');
    if (btnNovoPac) btnNovoPac.style.display = (currentUser && (isCurrentUserAdmin() || hasPerm('adicionar_paciente'))) ? '' : 'none';
    const s = normalizeStr(document.getElementById('filter-patient').value);
    const grid = document.getElementById('patients-grid');
    grid.innerHTML = '';

    patients.filter(p => normalizeStr(p.nome).includes(s) || normalizeStr(p.cpf).includes(s)).forEach(p => {
        const age = getAge(p.dtNasc);
        const hasAppointments = appointments.some(a => a.patientId == p.id);

        grid.innerHTML += `<div class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-lg transition relative flex flex-col h-full group">
            <div class="absolute top-4 right-4 flex items-center gap-2">
                ${permBtn('editar_paciente', `<button onclick="editPatient(${p.id})" class="text-slate-300 hover:text-clinic-600 transition" title="Editar Cadastro"><i class="fas fa-pen"></i></button>`)}
                ${!hasAppointments ? permBtn('excluir_paciente', `<button onclick="deletePatient(${p.id})" class="text-slate-300 hover:text-red-500 transition" title="Excluir Paciente"><i class="fas fa-trash text-sm"></i></button>`) : ''}
            </div>
            <div class="flex items-center gap-3 mb-4">
                <div class="h-12 w-12 bg-gradient-to-br from-navy-800 to-navy-600 text-white rounded-full flex items-center justify-center font-black text-xl shadow-md">${p.nome.charAt(0)}</div>
                <div><h4 class="font-black text-navy-900 text-sm truncate max-w-[150px] leading-tight">${p.nome}</h4><p class="text-[10px] font-black text-slate-400 tracking-wider">${age} ANOS | ${p.cpf}</p></div>
            </div>
            <div class="text-[10px] text-slate-600 mb-4 space-y-1.5 flex-1 font-bold">
                <p class="flex items-center"><i class="fab fa-whatsapp w-5 text-green-500 text-sm"></i> ${p.contato}</p>
                ${p.responsavel ? `<p class="flex items-center gap-1"><i class="fas fa-user-shield w-5 text-slate-400 text-sm"></i> Resp: ${p.responsavel}${p.responsavelParentesco ? ` <span class="bg-slate-100 px-1 rounded text-[9px] uppercase font-black text-slate-500">${p.responsavelParentesco}</span>` : ''}</p>` : ''}
                ${p.responsavelCPF ? `<p class="flex items-center"><i class="fas fa-id-card w-5 text-slate-400 text-sm"></i> CPF Resp: ${p.responsavelCPF}</p>` : ''}
            </div>

            <div class="border-t border-slate-100 pt-3 mb-4">
                <button onclick="viewPatientHistory(${p.id})" class="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 p-3 rounded-xl transition border border-slate-100 group/btn shadow-sm">
                    <span class="text-xs font-black uppercase text-navy-900"><i class="fas fa-file-medical-alt mr-2 text-clinic-500"></i> Prontuário Vacinal</span>
                    <i class="fas fa-chevron-right text-xs text-slate-300 group-hover/btn:text-clinic-500 transition"></i>
                </button>
            </div>

            ${permBtn('criar_agendamento', `<button onclick="openRecordModalWithPatient(${p.id})" class="w-full mt-auto border-2 border-clinic-600 text-clinic-600 hover:bg-clinic-600 hover:text-white font-black py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition shadow-sm"><i class="fas fa-plus mr-1"></i> Agendar Vacina</button>`)}
        </div>`;
    });
}

function openPatientModal(id = null) {
    if (id && !checkPerm('editar_paciente')) return;
    if (!id && !checkPerm('adicionar_paciente')) return;
    _patientModalOpenedFromRecord = document.getElementById('modal-record').classList.contains('active');
    document.getElementById('paciente-form').reset(); document.getElementById('pac-id').value = '';
    document.getElementById('div-pac-resp').style.display = 'none';
    if(id) {
        const p = patients.find(x=>x.id==id);
        if(p){
            document.getElementById('pac-id').value = p.id; document.getElementById('pac-nome').value = p.nome;
            document.getElementById('pac-cpf').value = p.cpf; document.getElementById('pac-dtnasc').value = p.dtNasc;
            document.getElementById('pac-contato').value = formatPhone(p.contato); document.getElementById('pac-responsavel').value = p.responsavel || '';
            document.getElementById('pac-resp-cpf').value = p.responsavelCPF || '';
            document.getElementById('pac-resp-parentesco').value = p.responsavelParentesco || '';
            document.getElementById('pac-genero').value = p.genero || '';
            checkUnderage();
        }
    }
    document.getElementById('modal-paciente').classList.add('active');
}

function closePatientModal() {
    document.getElementById('modal-paciente').classList.remove('active');
    if (_patientModalOpenedFromRecord) {
        document.getElementById('modal-record').classList.add('active');
    }
}

function editPatient(id) { openPatientModal(id); }

function deletePatient(id) {
    if (!checkPerm('excluir_paciente')) return;
    const p = patients.find(x => x.id == id);
    if (!p) return;
    if (appointments.some(a => a.patientId == id)) {
        showNotification('Paciente possui agendamentos e não pode ser excluído.', 'error');
        return;
    }
    pendingDeletePatientId = id;
    document.getElementById('delete-patient-info').textContent = p.nome + ' | ' + p.cpf;
    document.getElementById('delete-patient-input').value = '';
    checkDeletePatientConfirm();
    document.getElementById('modal-delete-patient').classList.add('active');
}

function checkDeletePatientConfirm() {
    const val = document.getElementById('delete-patient-input').value;
    const btn = document.getElementById('btn-confirm-delete-patient');
    if (val.toUpperCase() === 'SIM') {
        btn.disabled = false;
        btn.className = 'flex-1 bg-red-600 text-white font-black py-3 rounded-xl uppercase text-xs transition hover:bg-red-700 cursor-pointer';
    } else {
        btn.disabled = true;
        btn.className = 'flex-1 bg-red-200 text-red-400 font-black py-3 rounded-xl uppercase text-xs transition cursor-not-allowed';
    }
}

function confirmDeletePatient() {
    if (!pendingDeletePatientId) return;
    const delPac = patients.find(x => x.id == pendingDeletePatientId);
    logAudit('Excluído', 'paciente', pendingDeletePatientId, delPac ? delPac.nome : '—', delPac ? `CPF: ${delPac.cpf}` : null);
    patients = patients.filter(x => x.id != pendingDeletePatientId);
    pendingDeletePatientId = null;
    saveAll();
    document.getElementById('modal-delete-patient').classList.remove('active');
    document.getElementById('delete-patient-input').value = '';
    renderPatients();
    showNotification('Paciente excluído com sucesso.', 'success');
}

function viewPatientHistory(id) {
    const p = patients.find(x=>x.id==id);
    if(!p) return;
    document.getElementById('modal-patient-history').dataset.patientId = id;
    document.getElementById('hist-patient-name').innerText = p.nome;
    const list = document.getElementById('patient-history-list');
    const apps = appointments.filter(a=>a.patientId==id).sort((a,b)=>new Date(b.data)-new Date(a.data));

    if(apps.length === 0) {
        list.innerHTML = '<div class="text-center py-10"><i class="fas fa-folder-open text-4xl text-slate-200 mb-3"></i><p class="text-sm text-slate-400 font-bold uppercase">Nenhum registro encontrado</p></div>';
    } else {
        const pendentes = apps.filter(a => a.status === 'Agendado' || a.status === 'Em negociação');
        const concluidos = apps.filter(a => a.status === 'Aplicado');
        const cancelados = apps.filter(a => a.status === 'Cancelado');

        let html = '';

        if(pendentes.length > 0) {
            html += `<h5 class="text-xs font-black text-slate-500 uppercase tracking-widest mb-3"><i class="fas fa-clock mr-1 text-yellow-500 text-sm"></i> Pendentes / Futuros <span class="ml-2 bg-slate-100 px-2 py-0.5 rounded text-[9px]">${pendentes.length}</span></h5>`;
            html += pendentes.map(a => renderHistCard(a)).join('');
            html += `<div class="mb-6"></div>`;
        }

        if(concluidos.length > 0) {
            html += `<h5 class="text-xs font-black text-slate-500 uppercase tracking-widest mb-3"><i class="fas fa-check-circle mr-1 text-green-500 text-sm"></i> Vacinas Aplicadas <span class="ml-2 bg-slate-100 px-2 py-0.5 rounded text-[9px]">${concluidos.length}</span></h5>`;
            html += concluidos.map(a => renderHistCard(a)).join('');
            html += `<div class="mb-6"></div>`;
        }

        if(cancelados.length > 0) {
            html += `<h5 class="text-xs font-black text-slate-500 uppercase tracking-widest mb-3"><i class="fas fa-times-circle mr-1 text-red-500 text-sm"></i> Cancelamentos / Faltas <span class="ml-2 bg-slate-100 px-2 py-0.5 rounded text-[9px]">${cancelados.length}</span></h5>`;
            html += cancelados.map(a => renderHistCard(a)).join('');
        }

        list.innerHTML = html;
    }
    document.getElementById('modal-patient-history').classList.add('active');
}

function renderHistCard(a) {
    const vac = vaccines.find(v=>v.id==a.vaccineId);
    if(!vac) return '';
    const todayStr = new Date().toISOString().split('T')[0];
    const isDelayed = a.data < todayStr && a.status === 'Agendado';

    let borderClass = a.status==='Aplicado'?'border-green-200 hover:border-green-400':a.status==='Cancelado'?'border-red-200 hover:border-red-400':a.status==='Em negociação'?'border-cyan-200 hover:border-cyan-400':isDelayed?'border-yellow-300 hover:border-yellow-500':'border-blue-200 hover:border-blue-400';
    let bgClass = a.status==='Aplicado'?'bg-green-50/50':a.status==='Cancelado'?'bg-red-50/50':a.status==='Em negociação'?'bg-cyan-50/50':isDelayed?'bg-yellow-50/50':'bg-blue-50/50';
    let stTextClass = a.status==='Aplicado'?'text-green-600':a.status==='Cancelado'?'text-red-600':a.status==='Em negociação'?'text-cyan-600':isDelayed?'text-yellow-600':'text-blue-600';
    let iconClass = a.status==='Aplicado'?'fa-check text-green-500':a.status==='Cancelado'?'fa-ban text-red-500':isDelayed?'fa-exclamation-triangle text-yellow-500':'fa-calendar-alt text-blue-500';

    return `
    <button onclick="editRecord(${a.id})" class="w-full text-left ${bgClass} p-4 rounded-xl border ${borderClass} shadow-sm hover:shadow-md transition flex flex-col md:flex-row justify-between items-start md:items-center mb-3 group">
        <div class="flex items-center gap-4 mb-2 md:mb-0">
            <div class="h-10 w-10 bg-white rounded-full flex justify-center items-center shadow-sm text-lg border border-slate-100 group-hover:scale-110 transition duration-300"><i class="fas ${iconClass}"></i></div>
            <div>
                <p class="font-black text-navy-900 text-[15px] uppercase tracking-tight">${vac.nome}</p>
                <p class="text-[11px] text-slate-500 font-bold">${a.doseAtual} <span class="mx-1">•</span> <span class="${stTextClass} uppercase tracking-wider">${isDelayed ? 'Atrasado' : a.status}</span></p>
            </div>
        </div>
        <div class="text-left md:text-right w-full md:w-auto flex flex-row md:flex-col justify-between items-center md:items-end">
            <p class="font-black text-slate-700 text-sm"><i class="fas fa-calendar-day mr-1 text-slate-400"></i> ${a.data.split('-').reverse().join('/')}${a.hora ? ' <span class="text-[10px] text-slate-400">'+a.hora+'</span>' : ''}</p>
            <span class="text-[9px] text-clinic-600 uppercase font-black bg-white px-2 py-1 rounded shadow-sm border border-clinic-100 group-hover:bg-clinic-600 group-hover:text-white transition mt-1">Ver Detalhes <i class="fas fa-arrow-right ml-1"></i></span>
        </div>
    </button>`;
}

function checkUnderage() {
    const age = getAge(document.getElementById('pac-dtnasc').value);
    const divResp = document.getElementById('div-pac-resp');
    const divRespCpf = document.getElementById('div-pac-resp-cpf');
    const divRespParentesco = document.getElementById('div-pac-resp-parentesco');
    const inResp = document.getElementById('pac-responsavel');
    if(age < 18) {
        divResp.style.display = 'block'; divRespCpf.style.display = 'block'; divRespParentesco.style.display = 'block';
        inResp.required = true;
    } else {
        divResp.style.display = 'none'; divRespCpf.style.display = 'none'; divRespParentesco.style.display = 'none';
        inResp.required = false; inResp.value = '';
        document.getElementById('pac-resp-cpf').value = '';
        document.getElementById('pac-resp-parentesco').value = '';
    }
}

function savePatient(e) {
    e.preventDefault();
    const id = document.getElementById('pac-id').value;
    const p = {
        id: id ? Number(id) : Date.now(), nome: document.getElementById('pac-nome').value.toUpperCase(),
        cpf: document.getElementById('pac-cpf').value, dtNasc: document.getElementById('pac-dtnasc').value,
        genero: document.getElementById('pac-genero').value,
        contato: document.getElementById('pac-contato').value.replace(/\D/g,''), responsavel: document.getElementById('pac-responsavel').value.toUpperCase(),
        responsavelCPF: document.getElementById('pac-resp-cpf').value,
        responsavelParentesco: document.getElementById('pac-resp-parentesco').value
    };
    const isNewPac = !id;
    const oldPac = isNewPac ? null : patients.find(x => x.id == p.id);
    if(id) patients = patients.map(x=>x.id==p.id?p:x); else patients.push(p);
    const pacChanges = isNewPac ? null : computeChanges(oldPac, p, {nome:'Nome', cpf:'CPF', dtNasc:'Data Nasc.', genero:'Gênero', contato:'Contato', responsavel:'Responsável', responsavelCPF:'CPF Resp.', responsavelParentesco:'Parentesco'});
    logAudit(isNewPac ? 'Criado' : 'Editado', 'paciente', p.id, p.nome, isNewPac ? `CPF: ${p.cpf}` : null, pacChanges);
    const reopenRecord = _patientModalOpenedFromRecord;
    saveAll(); renderPatients(); closeModals(); showNotification('Paciente salvo com sucesso!','success');
    populatePatientDatalist();
    if(reopenRecord) { document.getElementById('modal-record').classList.add('active'); autoFillPatient(); }
}

async function downloadVaccineCalendarPDF() {
    if (!checkPerm('baixar_pdf')) return;
    const modal = document.getElementById('modal-patient-history');
    const id = Number(modal.dataset.patientId);
    const p = patients.find(x => x.id == id);
    if (!p) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, H = 297;

    // ── Cores ──────────────────────────────────────────────────────────────────
    const navy    = [15, 23, 42];        // #0f172a
    const navyMid = [23, 37, 84];        // #172554
    const accent  = [37, 99, 235];       // #2563eb
    const white   = [255, 255, 255];
    const light   = [238, 242, 247];     // #eef2f7
    const border  = [226, 232, 240];    // slate-200

    // ── Fundo ──────────────────────────────────────────────────────────────────
    doc.setFillColor(...light);
    doc.rect(0, 0, W, H, 'F');

    // ── Header block ───────────────────────────────────────────────────────────
    doc.setFillColor(...navy);
    doc.rect(0, 0, W, 42, 'F');

    // Barra accent lateral esquerda no header
    doc.setFillColor(...accent);
    doc.rect(0, 0, 6, 42, 'F');

    // Logo (carregada via base64 via canvas)
    try {
        const logoUrl = 'https://i.imgur.com/EIxKgPF.png';
        const img = await new Promise((res, rej) => {
            const i = new Image(); i.crossOrigin = 'anonymous';
            i.onload = () => res(i); i.onerror = rej;
            i.src = logoUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        // logo no canto direito do header, proporcional, altura ~24 mm
        const ratio = img.naturalWidth / img.naturalHeight;
        const lH = 24, lW = lH * ratio;
        doc.addImage(dataUrl, 'PNG', W - lW - 14, (42 - lH) / 2 - 3, lW, lH);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(...white);
        const endY = (42 - lH) / 2 - 3 + lH + 3.5;
        doc.text('Rua Padre Cícero, 759 - Centro - Juazeiro do Norte - CE', W - lW - 14 + lW / 2, endY, { align: 'center' });
    } catch(e) { /* logo opcional */ }

    // Título no header
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('CALENDÁRIO DE VACINAÇÃO', 14, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...accent);
    doc.text('IMUNOGEST  •  REGISTRO VACINAL DO PACIENTE', 14, 25);

    // Linha separadora decorativa
    doc.setFillColor(...accent);
    doc.rect(14, 30, 60, 0.8, 'F');

    // Data de emissão
    doc.setTextColor(...white);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const hoje = new Date().toLocaleDateString('pt-BR', {day:'2-digit',month:'long',year:'numeric'});
    doc.text(`Emitido em: ${hoje}`, 14, 38);

    // ── Card de dados do paciente ──────────────────────────────────────────────
    const cardY = 50;
    doc.setFillColor(...white);
    doc.roundedRect(12, cardY, W - 24, 48, 4, 4, 'F');
    doc.setDrawColor(...border);
    doc.setLineWidth(0.3);
    doc.roundedRect(12, cardY, W - 24, 48, 4, 4, 'S');

    // Barra lateral esquerda accent no card
    doc.setFillColor(...navyMid);
    doc.roundedRect(12, cardY, 4, 48, 2, 2, 'F');

    // Nome do paciente (grande)
    doc.setTextColor(...navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(p.nome || '—', 22, cardY + 13);

    // Linha divisória fina
    doc.setDrawColor(...border);
    doc.setLineWidth(0.2);
    doc.line(22, cardY + 17, W - 16, cardY + 17);

    // Dados em duas colunas
    const idade = getAge(p.dtNasc);
    const dtFormatada = p.dtNasc ? p.dtNasc.split('-').reverse().join('/') : '—';
    const cpfFormatado = p.cpf ? p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—';

    const col1x = 22, col2x = 115;
    const rowY1 = cardY + 26, rowY2 = cardY + 38;

    const label = (txt, x, y) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
        doc.setTextColor(...accent); doc.text(txt.toUpperCase(), x, y);
    };
    const value = (txt, x, y) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        doc.setTextColor(...navy); doc.text(txt, x, y + 5);
    };

    label('Idade', col1x, rowY1);        value(`${idade} anos`, col1x, rowY1);
    label('Data de Nascimento', col2x, rowY1); value(dtFormatada, col2x, rowY1);
    label('CPF', col1x, rowY2);           value(cpfFormatado, col1x, rowY2);
    if (p.responsavel) {
        const parentescoStr = p.responsavelParentesco ? ` (${p.responsavelParentesco})` : '';
        label(`Responsável${parentescoStr}`, col2x, rowY2);
        value(p.responsavel, col2x, rowY2);
    }

    // ── Tabela de Vacinas ──────────────────────────────────────────────────────
    const apps = appointments.filter(a => a.patientId == id && (a.status === 'Aplicado' || a.status === 'Agendado'));

    // Agrupar por vacina (nome) e ordenar alfabeticamente
    const grouped = {};
    apps.forEach(a => {
        const vac = vaccines.find(v => v.id == a.vaccineId);
        if (!vac) return;
        if (!grouped[vac.nome]) grouped[vac.nome] = [];
        grouped[vac.nome].push(a);
    });

    const sortedVaccines = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const rows = [];
    sortedVaccines.forEach(vacNome => {
        const doses = grouped[vacNome].sort((a, b) => {
            const numA = parseInt(a.doseAtual) || 0, numB = parseInt(b.doseAtual) || 0;
            return numA !== numB ? numA - numB : a.doseAtual.localeCompare(b.doseAtual, 'pt-BR');
        });
        doses.forEach(a => {
            rows.push([vacNome, a.doseAtual, a.lote || '—', a.data.split('-').reverse().join('/'), a.status]);
        });
    });

    const tableStartY = cardY + 56;

    // Título da seção
    doc.setFillColor(...navyMid);
    doc.roundedRect(12, tableStartY, W - 24, 9, 2, 2, 'F');
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('HISTÓRICO DE VACINAS', 18, tableStartY + 6);

    if (rows.length === 0) {
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('Nenhuma vacina aplicada encontrada.', 18, tableStartY + 20);
    } else {
        // Cabeçalho da tabela (5 colunas) — ordem: VACINA | DOSE | LOTE | DATA | STATUS
        const tY = tableStartY + 11;
        const colX = [18, 82, 116, 152, 170];
        const colW = [62, 32, 34, 16, 28];
        const headers = ['VACINA', 'DOSE', 'LOTE', 'DATA', 'STATUS'];

        doc.setFillColor(241, 245, 249);
        doc.rect(12, tY, W - 24, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...navyMid);
        headers.forEach((h, i) => {
            const centered = i === 3 || i === 4;
            const x = centered ? colX[i] + colW[i] / 2 : colX[i];
            doc.text(h, x, tY + 5, centered ? { align: 'center' } : {});
        });

        // Linhas da tabela
        let curY = tY + 7;
        rows.forEach((row, idx) => {
            if (curY > H - 20) {
                doc.addPage();
                doc.setFillColor(...light);
                doc.rect(0, 0, W, H, 'F');
                curY = 20;
            }

            if (idx % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(12, curY, W - 24, 8, 'F');
            }

            const status = row[4];
            const btnColor = status === 'Aplicado' ? [22, 163, 74] : [37, 99, 235];
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(...navy);
            doc.text(row[0], colX[0], curY + 5.5, { maxWidth: colW[0] - 2 });
            doc.text(row[1], colX[1], curY + 5.5);
            doc.setTextColor(100, 116, 139);
            doc.text(row[2], colX[2], curY + 5.5);
            doc.setTextColor(...btnColor);
            doc.setFont('helvetica', 'bold');
            doc.text(row[3], colX[3] + colW[3] / 2, curY + 5.5, { align: 'center' });

            // Badge STATUS
            const statusColors = {
                'Aplicado':      [22,  163,  74],
                'Agendado':      [37,   99, 235],
                'Em negociação': [234, 179,   8],
                'Cancelado':     [220,  38,  38],
            };
            const badgeColor = statusColors[status] || [100, 116, 139];
            const badgeLabel = status.toUpperCase();
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            const textW = doc.getTextWidth(badgeLabel);
            const padX = 2.5;
            const btnW = textW + padX * 2;
            const btnH = 4;
            const btnX = colX[4] + (colW[4] - btnW) / 2;
            const btnY = curY + 2;
            doc.setFillColor(...badgeColor);
            doc.roundedRect(btnX, btnY, btnW, btnH, 2, 2, 'F');
            doc.setTextColor(...white);
            doc.text(badgeLabel, btnX + btnW / 2, btnY + btnH / 2 + 0.9, { align: 'center' });

            doc.setDrawColor(...border);
            doc.setLineWidth(0.15);
            doc.line(12, curY + 8, W - 12, curY + 8);

            curY += 8;
        });
    }

    // ── Assinatura do Responsável Técnico ─────────────────────────────────────
    let sigDataUrl = null;
    let sigNaturalW = 0, sigNaturalH = 1;
    try {
        const sigImg = await new Promise((res, rej) => {
            const si = new Image(); si.crossOrigin = 'anonymous';
            si.onload = () => res(si); si.onerror = rej;
            si.src = 'https://i.imgur.com/hwy39IM.png';
        });
        const sigCanvas = document.createElement('canvas');
        sigCanvas.width = sigImg.naturalWidth; sigCanvas.height = sigImg.naturalHeight;
        sigCanvas.getContext('2d').drawImage(sigImg, 0, 0);
        sigDataUrl = sigCanvas.toDataURL('image/png');
        sigNaturalW = sigImg.naturalWidth;
        sigNaturalH = sigImg.naturalHeight;
    } catch(e) { /* assinatura opcional */ }

    // ── Rodapé ────────────────────────────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        const sigBlockCenterX = W / 2;
        const sigLineY = H - 27;

        doc.setDrawColor(...navyMid);
        doc.setLineWidth(0.4);
        doc.line(sigBlockCenterX - 30, sigLineY, sigBlockCenterX + 30, sigLineY);

        if (sigDataUrl) {
            const sigH = 18;
            const sigW = sigH * (sigNaturalW / sigNaturalH);
            doc.addImage(sigDataUrl, 'PNG', sigBlockCenterX - sigW / 2, sigLineY - sigH / 2 - 5, sigW, sigH);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...navy);
        doc.text('Dr. Leonardo Bezerra - CRF 3710/CE', sigBlockCenterX, sigLineY + 5.5, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...accent);
        doc.text('Responsável Técnico', sigBlockCenterX, sigLineY + 10.5, { align: 'center' });

        doc.setFillColor(...navy);
        doc.rect(0, H - 12, W, 12, 'F');
        doc.setFillColor(...accent);
        doc.rect(0, H - 12, 6, 12, 'F');
        doc.setTextColor(...white);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('ImunoGest  •  Calendário Vacinal  •  LAMIC VACINAS', 14, H - 4.5);
        doc.text(`Página ${i} / ${totalPages}`, W - 14, H - 4.5, { align: 'right' });
    }

    doc.save(`Calendario_Vacinal_${p.nome.replace(/\s+/g,'_')}.pdf`);
}
