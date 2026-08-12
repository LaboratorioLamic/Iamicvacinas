// ─── IMPORTAÇÃO CPNI (Lista de aplicações de vacinas) ────────────────────────
// Importa histórico de doses aplicadas de uma planilha .xlsx do CPNI.
// Regras: títulos na linha 3 (índice 2), dados a partir da linha 4 (índice 3).
// NÃO afeta estoque (loteId sempre null, nunca passa por syncAppointmentMovement).
// Registros ficam marcados com importedCPNI:true, sempre status 'Aplicado', somente-leitura.

// Colunas fixas da planilha (índice 0-based)
const CPNI_COLS = {
    cpf: 4,          // E
    nome: 6,         // G
    dtNasc: 7,        // H
    sexo: 9,          // J
    lote: 12,         // M
    imuno: 13,        // N
    dose: 14,         // O
    dataAplicacao: 16 // Q
};

const CPNI_DOSE_CANONICAS = ['1ª Dose','2ª Dose','3ª Dose','4ª Dose','Dose Única','Reforço','Dose Zero'];

// ─── PARSING ──────────────────────────────────────────────────────────────────

function _cpniOnlyDigits(str) {
    return String(str || '').replace(/\D/g, '');
}

// Converte valor de célula de data (string dd/mm/aaaa, serial do Excel, ou Date) para 'YYYY-MM-DD'
function _cpniParseDate(val) {
    if (!val && val !== 0) return null;
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return null;
        return val.toISOString().split('T')[0];
    }
    if (typeof val === 'number') {
        // serial Excel (base 1900)
        const d = XLSX.SSF ? XLSX.SSF.parse_date_code(val) : null;
        if (d) return `${String(d.y).padStart(4,'0')}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
        return null;
    }
    const s = String(val).trim();
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    return null;
}

// Normaliza texto de dose para uma dose canônica reconhecida, ou null se não reconhecida
function _cpniNormalizeDose(txt) {
    const raw = normalizeStr(txt); // remove acentos/case/pontuação
    if (!raw) return null;
    let m = raw.match(/^(\d+)dose$/);
    if (m) return `${m[1]}ª Dose`;
    if (raw === 'dose') return '1ª Dose';
    if (raw === 'unica' || raw === 'doseunica') return 'Dose Única';
    m = raw.match(/^(\d+)reforco$/);
    if (m) return 'Reforço';
    if (raw === 'reforco') return 'Reforço';
    if (raw === 'dosezero' || raw === 'zero') return 'Dose Zero';
    return null;
}

function _cpniResetState() {
    _cpniParsedRows = [];
    _cpniInvalidDoseMap = {};
    _cpniStep = 1;
    _cpniImportRunning = false;
}

function openCpniImportModal() {
    if (!checkPerm('backup')) return;
    _cpniResetState();
    document.getElementById('cpni-file-input').value = '';
    document.getElementById('cpni-file-name').classList.add('hidden');
    _cpniGoToStep(1);
    document.getElementById('modal-cpni-import').classList.add('active');
}

function closeCpniImportModal() {
    if (_cpniImportRunning) return; // não fecha durante importação
    document.getElementById('modal-cpni-import').classList.remove('active');
    _cpniResetState();
}

function _cpniGoToStep(step) {
    _cpniStep = step;
    for (let i = 1; i <= 5; i++) {
        const el = document.getElementById('cpni-step-' + i);
        if (el) el.classList.toggle('hidden', i !== step);
        const foot = document.getElementById('cpni-footer-' + i);
        if (foot) foot.classList.toggle('hidden', i !== step);
    }
    document.querySelectorAll('.cpni-step-dot').forEach(dot => {
        const n = Number(dot.dataset.step);
        dot.classList.toggle('cpni-step-active', n === step);
        dot.classList.toggle('cpni-step-done', n < step);
    });
    if (step === 5) {
        document.getElementById('cpni-btn-finish').disabled = true;
    }
}

function prepareCpniUpload(input) {
    const file = input.files[0];
    if (!file) return;
    document.getElementById('cpni-file-name').classList.remove('hidden');
    document.getElementById('cpni-file-label').textContent = file.name;
    document.getElementById('cpni-parse-error').classList.add('hidden');

    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const data = new Uint8Array(ev.target.result);
            const wb = XLSX.read(data, { type: 'array', cellDates: true });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            // header:1 → array de arrays; range:2 pula linhas 1-2, começa lendo a partir da linha 3 (títulos)
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 2, defval: '' });
            // rows[0] = linha 3 (títulos) — descarta; dados a partir de rows[1] (linha 4)
            const dataRows = rows.slice(1);
            _cpniParseRows(dataRows);
        } catch (err) {
            console.error('[CPNI] erro ao ler planilha:', err);
            document.getElementById('cpni-parse-error').textContent = 'Não foi possível ler o arquivo. Verifique se é uma planilha .xlsx válida.';
            document.getElementById('cpni-parse-error').classList.remove('hidden');
            _cpniParsedRows = [];
        }
    };
    reader.readAsArrayBuffer(file);
}

function _cpniParseRows(dataRows) {
    const out = [];
    dataRows.forEach((row, idx) => {
        const cpf = _cpniOnlyDigits(row[CPNI_COLS.cpf]);
        const nome = String(row[CPNI_COLS.nome] || '').trim();
        if (!cpf && !nome) return; // linha vazia — ignora silenciosamente
        const dtNasc = _cpniParseDate(row[CPNI_COLS.dtNasc]);
        const sexoRaw = normalizeStr(row[CPNI_COLS.sexo]);
        const genero = sexoRaw.startsWith('f') ? 'Feminino' : sexoRaw.startsWith('m') ? 'Masculino' : '';
        const lote = String(row[CPNI_COLS.lote] || '').trim();
        const imuno = String(row[CPNI_COLS.imuno] || '').trim();
        const doseTexto = String(row[CPNI_COLS.dose] || '').trim();
        const dataAplicacao = _cpniParseDate(row[CPNI_COLS.dataAplicacao]);
        out.push({
            _row: idx + 4, // linha real na planilha (1-based), útil pra mensagens de erro
            cpf, nome, dtNasc, genero, lote, imuno, doseTexto, dataAplicacao,
            _erro: !cpf ? 'CPF ausente' : !nome ? 'Nome ausente' : !dataAplicacao ? 'Data de aplicação inválida' : !imuno ? 'Imunobiológico ausente' : null
        });
    });
    _cpniParsedRows = out;
    document.getElementById('cpni-rows-count').textContent = out.length;
    const comErro = out.filter(r => r._erro).length;
    document.getElementById('cpni-rows-erro').textContent = comErro;
    document.getElementById('cpni-rows-erro-wrap').classList.toggle('hidden', comErro === 0);
    document.getElementById('cpni-btn-next-1').disabled = out.length === 0;
    document.getElementById('cpni-btn-next-1').classList.toggle('opacity-50', out.length === 0);
    document.getElementById('cpni-btn-next-1').classList.toggle('cursor-not-allowed', out.length === 0);
}

// ─── PASSO 2 — MAPEAMENTO DE IMUNOBIOLÓGICOS ─────────────────────────────────

let _cpniImunoRows = []; // [{key, nome, count}] — linhas do passo 2, indexadas por posição p/ os campos de busca

function _cpniGoStep2() {
    const validRows = _cpniParsedRows.filter(r => !r._erro);
    const nomesUnicos = [...new Set(validRows.map(r => r.imuno).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'));

    _cpniImunoRows = nomesUnicos.map(nome => ({
        key: normalizeStr(nome),
        nome,
        count: validRows.filter(r => r.imuno === nome).length
    }));

    const list = document.getElementById('cpni-imuno-list');
    list.innerHTML = _cpniImunoRows.map((row, i) => {
        const mappedId = cpniImunoMap[row.key];
        const mappedVac = mappedId ? vaccines.find(v => v.id == mappedId) : null;
        return `<div class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
            <div class="flex-1 min-w-0">
                <p class="font-black text-navy-900 text-sm truncate">${row.nome}</p>
                <p class="text-[10px] text-slate-400 font-bold">${row.count} registro(s)</p>
            </div>
            <div class="relative w-[260px] shrink-0" id="cpni-imuno-wrap-${i}">
                <input type="text" id="cpni-imuno-search-${i}" data-idx="${i}" autocomplete="off"
                    oninput="_cpniFilterImunoDropdown(${i})" onfocus="_cpniFilterImunoDropdown(${i})" onblur="_cpniHideImunoDropdown(${i})"
                    placeholder="Pesquisar vacina..." value="${mappedVac ? mappedVac.nome.replace(/"/g,'&quot;') : ''}"
                    class="w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold uppercase focus:ring-2 focus:ring-clinic-500 outline-none">
                <input type="hidden" id="cpni-imuno-value-${i}" value="${mappedId || ''}">
                <div id="cpni-imuno-dropdown-${i}" class="hidden absolute z-[10] left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-y-auto" style="max-height:200px;"></div>
            </div>
        </div>`;
    }).join('') || '<p class="text-center text-slate-400 text-sm py-6 font-bold">Nenhum imunobiológico encontrado.</p>';

    _cpniGoToStep(2);
}

function _cpniFilterImunoDropdown(i) {
    const input = document.getElementById(`cpni-imuno-search-${i}`);
    const dd = document.getElementById(`cpni-imuno-dropdown-${i}`);
    if (!input || !dd) return;
    const val = normalizeStr(input.value);
    const ativos = vaccines.filter(v => v.ativo !== false);
    const matches = (val ? ativos.filter(v => {
        if (normalizeStr(v.nome).includes(val)) return true;
        if (v.mnemonico && normalizeStr(v.mnemonico).includes(val)) return true;
        return vaccineLots.some(l => l.vaccineId == v.id && l.fabricante && normalizeStr(l.fabricante).includes(val));
    }) : ativos).sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'));

    if (!matches.length) { dd.innerHTML = '<div class="px-3 py-2 text-xs text-slate-400 font-bold">Nenhuma vacina encontrada</div>'; dd.classList.remove('hidden'); return; }
    dd.innerHTML = matches.map(v =>
        `<div class="px-3 py-2 hover:bg-clinic-50 hover:text-clinic-700 cursor-pointer text-sm font-bold text-navy-900 border-b border-slate-100 last:border-0 transition uppercase"
              onmousedown="_cpniSelectImunoVaccine(${i},${v.id},'${v.nome.replace(/'/g,"\\'")}')">
            <span>${v.nome}</span>
            ${v.mnemonico ? `<br><span class="inline-flex items-center bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full text-[9px] font-black normal-case mt-0.5">${v.mnemonico}</span>` : ''}
        </div>`
    ).join('');
    dd.classList.remove('hidden');
}

function _cpniHideImunoDropdown(i) {
    setTimeout(() => { const dd = document.getElementById(`cpni-imuno-dropdown-${i}`); if (dd) dd.classList.add('hidden'); }, 150);
}

function _cpniSelectImunoVaccine(i, vaccineId, nome) {
    document.getElementById(`cpni-imuno-search-${i}`).value = nome;
    document.getElementById(`cpni-imuno-value-${i}`).value = vaccineId;
    document.getElementById(`cpni-imuno-dropdown-${i}`).classList.add('hidden');
    const row = _cpniImunoRows[i];
    if (row) cpniImunoMap[row.key] = vaccineId;
}

function _cpniConfirmImunoStep() {
    // Se o usuário limpou o campo de busca sem selecionar nada da lista, remove o mapeamento dessa linha
    _cpniImunoRows.forEach((row, i) => {
        const valEl = document.getElementById(`cpni-imuno-value-${i}`);
        const searchEl = document.getElementById(`cpni-imuno-search-${i}`);
        if (!searchEl || !searchEl.value.trim() || !valEl || !valEl.value) delete cpniImunoMap[row.key];
    });
    saveAll(); // persiste o mapeamento pra próximas importações
    _cpniGoStep3();
}

// ─── PASSO 3 — REVISÃO DE DOSES INVÁLIDAS ────────────────────────────────────

function _cpniGoStep3() {
    const validRows = _cpniParsedRows.filter(r => !r._erro && cpniImunoMap[normalizeStr(r.imuno)]);
    const textosInvalidos = new Set();
    validRows.forEach(r => {
        if (!_cpniNormalizeDose(r.doseTexto)) textosInvalidos.add(r.doseTexto || '(vazio)');
    });

    const list = document.getElementById('cpni-dose-list');
    if (!textosInvalidos.size) {
        list.innerHTML = '<p class="text-center text-emerald-600 text-sm py-6 font-black"><i class="fas fa-check-circle mr-2"></i>Todas as doses foram reconhecidas automaticamente.</p>';
    } else {
        list.innerHTML = [...textosInvalidos].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(txt => {
            const count = validRows.filter(r => (r.doseTexto || '(vazio)') === txt).length;
            return `<div class="flex items-center gap-3 p-3 bg-white border border-amber-200 rounded-xl">
                <i class="fas fa-triangle-exclamation text-amber-500"></i>
                <div class="flex-1 min-w-0">
                    <p class="font-black text-navy-900 text-sm truncate">"${txt}"</p>
                    <p class="text-[10px] text-slate-400 font-bold">${count} registro(s)</p>
                </div>
                <select data-dose-txt="${txt.replace(/"/g,'&quot;')}" onchange="_cpniSetDoseMap(this)" class="border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold focus:ring-1 focus:ring-clinic-500 outline-none min-w-[180px]">
                    <option value="">— Não importar —</option>
                    ${CPNI_DOSE_CANONICAS.map(d => `<option value="${d}">${d}</option>`).join('')}
                </select>
            </div>`;
        }).join('');
    }

    _cpniGoToStep(3);
}

function _cpniSetDoseMap(sel) {
    const txt = sel.dataset.doseTxt === '(vazio)' ? '' : sel.dataset.doseTxt;
    if (sel.value) _cpniInvalidDoseMap[txt] = sel.value;
    else delete _cpniInvalidDoseMap[txt];
}

// Resolve a dose canônica final de uma linha (ou null se não deve ser importada)
function _cpniResolveDose(row) {
    const canon = _cpniNormalizeDose(row.doseTexto);
    if (canon) return canon;
    return _cpniInvalidDoseMap[row.doseTexto || ''] || null;
}

// ─── PASSO 4 — RESUMO ─────────────────────────────────────────────────────────

function _cpniGoStep4() {
    let prontos = 0, semImuno = 0, semDose = 0, duplicadas = 0, comErro = 0;
    const seen = new Set(); // dedup dentro da própria planilha

    _cpniParsedRows.forEach(r => {
        if (r._erro) { comErro++; return; }
        const vaccineId = cpniImunoMap[normalizeStr(r.imuno)];
        if (!vaccineId) { semImuno++; return; }
        const dose = _cpniResolveDose(r);
        if (!dose) { semDose++; return; }
        const cpfDigits = r.cpf;
        const existing = patients.find(p => _cpniOnlyDigits(p.cpf) === cpfDigits);
        const dupKey = `${cpfDigits}|${vaccineId}|${dose}|${r.dataAplicacao}`;
        const jaExisteNoSistema = existing && appointments.some(a =>
            a.patientId === existing.id && a.vaccineId === vaccineId && a.doseAtual === dose && a.data === r.dataAplicacao);
        if (seen.has(dupKey) || jaExisteNoSistema) { duplicadas++; return; }
        seen.add(dupKey);
        prontos++;
    });

    document.getElementById('cpni-resumo-prontos').textContent = prontos;
    document.getElementById('cpni-resumo-duplicadas').textContent = duplicadas;
    document.getElementById('cpni-resumo-sem-imuno').textContent = semImuno;
    document.getElementById('cpni-resumo-sem-dose').textContent = semDose;
    document.getElementById('cpni-resumo-erro').textContent = comErro;
    const btn = document.getElementById('cpni-btn-confirm-import');
    btn.disabled = prontos === 0;
    btn.classList.toggle('opacity-50', prontos === 0);
    btn.classList.toggle('cursor-not-allowed', prontos === 0);

    _cpniGoToStep(4);
}

// ─── PASSO 5 — EXECUÇÃO COM PROGRESSO ────────────────────────────────────────

function _cpniStartImport() {
    _cpniGoToStep(5);
    _cpniImportRunning = true;
    document.getElementById('cpni-progress-bar').style.width = '0%';
    document.getElementById('cpni-progress-label').textContent = `Processando 0/${_cpniParsedRows.length}...`;
    document.getElementById('cpni-progress-done').classList.add('hidden');

    const seen = new Set();
    let idx = 0, seq = 0;
    const stats = { criados: 0, pacientesNovos: 0, duplicadas: 0, semImuno: 0, semDose: 0, erro: 0 };
    const BATCH = 50;
    const total = _cpniParsedRows.length;

    function processBatch() {
        const limite = Math.min(idx + BATCH, total);
        for (; idx < limite; idx++) {
            const r = _cpniParsedRows[idx];
            if (r._erro) { stats.erro++; continue; }
            const vaccineId = cpniImunoMap[normalizeStr(r.imuno)];
            if (!vaccineId) { stats.semImuno++; continue; }
            const dose = _cpniResolveDose(r);
            if (!dose) { stats.semDose++; continue; }

            let p = patients.find(x => _cpniOnlyDigits(x.cpf) === r.cpf);
            if (!p) {
                const isMinor = r.dtNasc ? getAge(r.dtNasc) < 18 : false;
                p = {
                    id: Date.now() + seq++,
                    nome: r.nome.toUpperCase(),
                    cpf: r.cpf,
                    dtNasc: r.dtNasc || '',
                    genero: r.genero || '',
                    contato: '',
                    responsavel: '',
                    responsavelCPF: '',
                    responsavelParentesco: '',
                    dadosIncompletos: isMinor
                };
                patients.push(p);
                stats.pacientesNovos++;
            }

            const dupKey = `${r.cpf}|${vaccineId}|${dose}|${r.dataAplicacao}`;
            const jaExisteNoSistema = appointments.some(a =>
                a.patientId === p.id && a.vaccineId === vaccineId && a.doseAtual === dose && a.data === r.dataAplicacao);
            if (seen.has(dupKey) || jaExisteNoSistema) { stats.duplicadas++; continue; }
            seen.add(dupKey);

            appointments.push({
                id: Date.now() + seq++,
                patientId: p.id,
                vaccineId: vaccineId,
                data: r.dataAplicacao,
                hora: '',
                doseAtual: dose,
                valorAplicado: '0,00',
                valorCheio: null,
                descontoPct: null,
                cortesia: false,
                status: 'Aplicado',
                loteId: null,
                lote: r.lote || '',
                motivoCancelamento: '',
                aplicadaOutroLocal: false,
                pedido: '',
                vendedor: '',
                aplicador: '',
                importedCPNI: true,
                importedAt: new Date().toISOString()
            });
            stats.criados++;
        }

        const pct = Math.round((idx / total) * 100);
        document.getElementById('cpni-progress-bar').style.width = pct + '%';
        document.getElementById('cpni-progress-label').textContent = `Processando ${idx}/${total}...`;

        if (idx < total) {
            requestAnimationFrame(() => setTimeout(processBatch, 0));
        } else {
            _cpniFinishImport(stats);
        }
    }

    requestAnimationFrame(() => setTimeout(processBatch, 0));
}

function _cpniFinishImport(stats) {
    _cpniImportRunning = false;
    try {
        saveAll();
        renderPatients(); renderCalendar(); renderTable(); renderDashboard();
        if (typeof populateVaccineSelects === 'function') populateVaccineSelects();
        logAudit('Criado', 'importacao_cpni', String(Date.now()), 'Importação CPNI',
            `${stats.criados} registro(s) importado(s) | ${stats.pacientesNovos} paciente(s) novo(s) | ${stats.duplicadas} duplicada(s) puladas | ${stats.semImuno} sem imunobiológico | ${stats.semDose} sem dose | ${stats.erro} com erro`);
        showNotification(`Importação CPNI concluída: ${stats.criados} registro(s) importado(s).`, 'success');
    } catch (err) {
        // Os registros já foram inseridos nos arrays em memória e o saveAll() já foi disparado
        // (ou tentado) acima; um erro nos renders/log não pode deixar o wizard travado.
        console.error('[CPNI] erro ao finalizar (renders/log):', err);
        showNotification('Importação concluída, mas houve um erro ao atualizar a tela. Recarregue a página.', 'error');
    } finally {
        // Sempre reabilita o resumo e o botão de concluir, mesmo se algo acima falhar.
        document.getElementById('cpni-progress-bar').style.width = '100%';
        document.getElementById('cpni-progress-label').textContent = 'Concluído!';
        document.getElementById('cpni-progress-done').classList.remove('hidden');
        document.getElementById('cpni-done-criados').textContent = stats.criados;
        document.getElementById('cpni-done-pacientes').textContent = stats.pacientesNovos;
        document.getElementById('cpni-done-duplicadas').textContent = stats.duplicadas;
        document.getElementById('cpni-done-pulados').textContent = stats.semImuno + stats.semDose + stats.erro;
        document.getElementById('cpni-btn-finish').disabled = false;
    }
}

function finishCpniImportModal() {
    document.getElementById('modal-cpni-import').classList.remove('active');
    _cpniResetState();
}

// ─── VISUALIZAÇÃO SOMENTE-LEITURA DE REGISTRO IMPORTADO ─────────────────────

function viewCpniRecord(id) {
    const a = appointments.find(x => x.id == id);
    if (!a) return;
    const pat = patients.find(x => x.id == a.patientId);
    const vac = vaccines.find(x => x.id == a.vaccineId);

    document.getElementById('cvr-avatar').textContent = pat ? (pat.nome || '?')[0].toUpperCase() : '?';
    document.getElementById('cvr-patient-name').textContent = pat ? pat.nome : '—';
    const age = pat && pat.dtNasc ? getAgeDisplay(pat.dtNasc) : '';
    document.getElementById('cvr-patient-meta').textContent = [pat?.cpf, age].filter(Boolean).join(' · ');
    document.getElementById('cvr-vaccine-name').textContent = vac ? vac.nome : '—';
    document.getElementById('cvr-dose').textContent = a.doseAtual || '—';
    document.getElementById('cvr-data').textContent = a.data ? a.data.split('-').reverse().join('/') : '—';
    document.getElementById('cvr-lote').textContent = a.lote || '—';
    document.getElementById('cvr-importado-em').textContent = a.importedAt
        ? new Date(a.importedAt).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
        : '—';

    const prontuarioBtn = document.getElementById('cvr-btn-prontuario');
    prontuarioBtn.onclick = (e) => { e.stopPropagation(); closeCpniViewRecord(); if (typeof viewPatientHistory === 'function') viewPatientHistory(a.patientId); };

    document.getElementById('modal-view-cpni-record').classList.add('active');
}

function closeCpniViewRecord() {
    document.getElementById('modal-view-cpni-record').classList.remove('active');
}
