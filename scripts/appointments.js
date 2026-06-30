// ─── APPOINTMENT MANAGEMENT (from index.html lines ~4972-5787) ───────────────

function _toggleBtnProntuario(show) {
    const btn = document.getElementById('btn-prontuario-agenda');
    if (btn) btn.classList.toggle('hidden', !show);
}

function populatePatientDatalist() { /* substituído por dropdown customizado */ }

function filterPatientDropdown() {
    const input = document.getElementById('reg-patient-search');
    const val = normalizeStr(input.value);
    const dd = document.getElementById('patient-dropdown');

    // Se o campo está vazio, invalida a seleção
    if(!val) { 
        document.getElementById('hidden-patient-id').value = '';
        _toggleBtnProntuario(false);
        input.setCustomValidity('Selecione um paciente válido da lista.');
        input.classList.add('border-red-400');
        input.classList.remove('border-slate-200');
        dd.classList.add('hidden'); 
        _resetAndDisableVaccineFields(); 
        return; 
    }

    // Se há um paciente válido selecionado e o valor não foi alterado, não invalida
    const currentPatientId = document.getElementById('hidden-patient-id').value;
    if (currentPatientId) {
        const currentPatient = patients.find(x => x.id == currentPatientId);
        if (currentPatient) {
            const currentValue = normalizeStr(`${currentPatient.cpf} - ${currentPatient.nome}`);
            if (currentValue === val) {
                // Paciente já está selecionado corretamente, apenas mostra dropdown com opções
                dd.classList.add('hidden'); 
                return;
            }
        }
    }

    // Ao digitar qualquer coisa diferente, invalida a seleção até selecionar novamente
    document.getElementById('hidden-patient-id').value = '';
    _toggleBtnProntuario(false);
    input.setCustomValidity('Selecione um paciente válido da lista.');
    input.classList.add('border-red-400');
    input.classList.remove('border-slate-200');

    // Busca por CPF ou Nome
    const matches = patients.filter(p =>
        normalizeStr(p.nome).includes(val) || normalizeStr(p.cpf).includes(val)
    ).slice(0, 12);
    if(!matches.length) { dd.classList.add('hidden'); return; }
    dd.innerHTML = matches.map(p =>
        `<div class="px-3 py-2 hover:bg-clinic-50 hover:text-clinic-700 cursor-pointer text-sm font-bold text-navy-900 border-b border-slate-100 last:border-0 transition"
              onmousedown="selectPatientFromDropdown(${p.id})">${p.cpf} — ${p.nome}</div>`
    ).join('');
    dd.classList.remove('hidden');
}

function hidePatientDropdown() {
    setTimeout(() => document.getElementById('patient-dropdown').classList.add('hidden'), 150);
}

function filterUserDropdown(inputId, ddId, flag) {
    const input = document.getElementById(inputId);
    const dd    = document.getElementById(ddId);
    if (!input || !dd) return;
    const val = normalizeStr(input.value);
    // Mostra usuários com a flag (vendedor/aplicador), incluindo admins com a flag
    const matches = appUsers.filter(u => u[flag] && (!val || normalizeStr(u.nome).includes(val))).slice(0, 10);
    if (!matches.length) { dd.classList.add('hidden'); return; }
    dd.innerHTML = matches.map(u =>
        `<div class="px-3 py-2 hover:bg-clinic-50 hover:text-clinic-700 cursor-pointer text-sm font-bold text-navy-900 border-b border-slate-100 last:border-0 transition"
              onmousedown="selectUserFromDropdown('${inputId}','${ddId}','${u.nome}')">${u.nome}</div>`
    ).join('');
    dd.classList.remove('hidden');
}

function hideUserDropdown(ddId) {
    setTimeout(() => { const dd = document.getElementById(ddId); if (dd) dd.classList.add('hidden'); }, 150);
}

function selectUserFromDropdown(inputId, ddId, nome) {
    const input = document.getElementById(inputId);
    if (input) { input.value = nome; }
    const dd = document.getElementById(ddId);
    if (dd) dd.classList.add('hidden');
    if (inputId === 'concluir-aplicador') checkConcluirLote();
}

function selectPatientFromDropdown(id) {
    const p = patients.find(x => x.id == id);
    if(!p) return;
    const input = document.getElementById('reg-patient-search');
    input.value = `${p.cpf} - ${p.nome}`;
    input.setCustomValidity('');
    input.classList.remove('border-red-400');
    input.classList.add('border-slate-200');
    document.getElementById('patient-dropdown').classList.add('hidden');
    autoFillPatient();
}

function updateIdadeField() {
    const dtNasc = document.getElementById('reg-dtnasc').value;
    const dtAgendada = document.getElementById('reg-data').value;
    const el = document.getElementById('reg-idade');
    if (!el) return;
    el.value = dtNasc ? getAgeDisplay(dtNasc, dtAgendada || null) : '';
}

function openRecordModal() {
    if (!checkPerm('criar_agendamento')) return;
    // Reseta estados globais
    window._doseAnteriorConfirmado = false;
    window._pendingDoseAnteriorEvent = null;
    document.getElementById('record-form').reset(); document.getElementById('reg-id').value = '';
    // Limpa inputs hidden que não são resetados automaticamente
    document.getElementById('reg-vacina').value = '';
    document.getElementById('hidden-patient-id').value = '';
    resetDescontoUI();
    document.getElementById('hidden-patient-id').value = '';
    // Limpa o dropdown de vacina para evitar sobreposição visual
    const _vacinaDropdown = document.getElementById('vacina-dropdown');
    if (_vacinaDropdown) { _vacinaDropdown.innerHTML = ''; _vacinaDropdown.classList.add('hidden'); }
    // Limpa todos os modais de aviso anteriores
    document.getElementById('modal-age-warning')?.classList.remove('active');
    document.getElementById('modal-aprazamento-aviso')?.classList.remove('active');
    document.getElementById('modal-dose-anterior-aviso')?.classList.remove('active');
    document.getElementById('modal-lote-expired-block')?.classList.remove('active');
    document.getElementById('modal-lote-expiry-warning')?.classList.remove('active');
    _toggleBtnProntuario(false);
    document.getElementById('div-responsavel').style.display = 'none';
    document.getElementById('div-responsavel-placeholder').style.display = 'block';
    document.getElementById('div-motivo-cancelamento').style.display = 'none';
    document.getElementById('sugestao-data').classList.add('hidden');
    document.getElementById('reg-data').removeAttribute('min');
    document.getElementById('reg-lote-validade-hint').classList.add('hidden');
    const _estoqueHintNew = document.getElementById('reg-lote-estoque-hint');
    if (_estoqueHintNew) _estoqueHintNew.classList.add('hidden');
    document.getElementById('lbl-lote').innerText = 'Lote';
    document.getElementById('reg-lote').required = false;
    document.getElementById('reg-lote').classList.add('border-slate-200');
    document.getElementById('reg-lote').classList.remove('border-clinic-300', 'ring-2', 'ring-clinic-100');
    document.getElementById('lbl-aplicador').innerText = 'Aplicador';
    document.getElementById('reg-aplicador').required = false;
    const regPedido = document.getElementById('reg-pedido');
    if (regPedido) { regPedido.value = ''; regPedido.required = false; }
    populatePatientDatalist(); populateVaccineSelects(); populateCancelReasons(); populateLoteSelect(null);
    // Bloqueia vacina até paciente ser selecionado
    const _vacinaSelNew = document.getElementById('reg-vacina');
    _vacinaSelNew.value = '';
    _vacinaSelNew.disabled = true;
    _vacinaSelNew.classList.add('opacity-50', 'cursor-not-allowed');
    document.getElementById('modal-title-agenda').innerText = 'Novo Agendamento Clínico';
    document.getElementById('btn-delete-record').classList.add('hidden');
    document.getElementById('btn-duplicar-record').classList.add('hidden');
    const _chkOutroLocalNew = document.getElementById('reg-aplicada-outro-local');
    if (_chkOutroLocalNew) { _chkOutroLocalNew.checked = false; toggleAplicadaOutroLocal(_chkOutroLocalNew); }
    if (currentUser) {
        const _fullUser = appUsers.find(u => u.id === currentUser.id);
        if (_fullUser && _fullUser.isVendedor) {
            document.getElementById('reg-vendedor').value = _fullUser.nome;
        }
    }
    document.getElementById('modal-record').classList.add('active');
}

function openRecordModalWithPatient(patId) {
    closeModals();
    openRecordModal();
    const p = patients.find(x=>x.id==patId);
    if(p) {
        setTimeout(() => {
            document.getElementById('reg-patient-search').value = `${p.cpf} - ${p.nome}`;
            autoFillPatient();
        }, 50);
    }
}

function filterVacinaDropdown() {
    const input = document.getElementById('reg-vacina-search');
    const dd    = document.getElementById('vacina-dropdown');
    if (!input || !dd || input.disabled) return;
    const val = normalizeStr(input.value);
    document.getElementById('reg-vacina').value = '';
    const ativos = vaccines.filter(v => v.ativo !== false);
    const matches = val
        ? ativos.filter(v => normalizeStr(v.nome).includes(val))
        : ativos;
    if (!matches.length) { dd.classList.add('hidden'); return; }
    dd.innerHTML = matches.map(v =>
        `<div class="px-3 py-2 hover:bg-clinic-50 hover:text-clinic-700 cursor-pointer text-sm font-bold text-navy-900 border-b border-slate-100 last:border-0 transition uppercase"
              onmousedown="selectVacinaFromDropdown(${v.id},'${v.nome.replace(/'/g,"\\'")}')">${v.nome}</div>`
    ).join('');
    dd.classList.remove('hidden');
}
function hideVacinaDropdown() {
    setTimeout(() => { const dd = document.getElementById('vacina-dropdown'); if (dd) dd.classList.add('hidden'); }, 150);
}
function selectVacinaFromDropdown(id, nome) {
    document.getElementById('reg-vacina-search').value = nome;
    document.getElementById('reg-vacina').value = id;
    document.getElementById('vacina-dropdown').classList.add('hidden');
    autoFillVaccine();
}

function clearVacinaField() {
    const inp = document.getElementById('reg-vacina-search');
    if (inp) inp.value = '';
    document.getElementById('reg-vacina').value = '';
    const doseSel = document.getElementById('reg-dose');
    if (doseSel) { doseSel.innerHTML = '<option value="">Selecione...</option>'; doseSel.value = ''; }
    document.getElementById('reg-valor').value = '';
    document.getElementById('reg-idade-min').value = '';
    populateLoteSelect('');
    resetDescontoUI();
}

function _enableVaccineFields() {
    const inp = document.getElementById('reg-vacina-search');
    if (!inp) return;
    inp.disabled = false;
    inp.placeholder = 'Buscar vacina...';
    inp.classList.remove('opacity-50', 'cursor-not-allowed');
}

function _resetAndDisableVaccineFields() {
    // Limpa e desabilita vacina
    const inp = document.getElementById('reg-vacina-search');
    if (inp) { inp.value = ''; inp.disabled = true; inp.placeholder = 'Selecione o paciente...'; inp.classList.add('opacity-50', 'cursor-not-allowed'); }
    document.getElementById('reg-vacina').value = '';
    // Limpa dose
    const doseSel = document.getElementById('reg-dose');
    doseSel.innerHTML = '<option value="">Selecione a vacina primeiro</option>';
    doseSel.value = '';
    // Limpa lote
    populateLoteSelect(null);
    // Limpa campos derivados
    document.getElementById('reg-idade-min').value = '';
    document.getElementById('reg-valor').value = '';
    document.getElementById('sugestao-data').classList.add('hidden');
    document.getElementById('reg-data').removeAttribute('min');
    resetDescontoUI();
}

function autoFillPatient() {
    const val = document.getElementById('reg-patient-search').value;
    const normVal = normalizeStr(val);
    const p = patients.find(x => normalizeStr(`${x.cpf} - ${x.nome}`) === normVal || normalizeStr(x.cpf) === normVal || normalizeStr(x.nome) === normVal);
    if(p) {
        const si = document.getElementById('reg-patient-search');
        si.setCustomValidity(''); si.classList.remove('border-red-400'); si.classList.add('border-slate-200');
        document.getElementById('hidden-patient-id').value = p.id;
        _toggleBtnProntuario(true);
        document.getElementById('reg-cpf').value = p.cpf;
        document.getElementById('reg-dtnasc').value = p.dtNasc;
        updateIdadeField();
        document.getElementById('reg-contato').value = formatPhone(p.contato);
        if(p.responsavel) {
            document.getElementById('div-responsavel').style.display = 'block';
            document.getElementById('div-responsavel-placeholder').style.display = 'none';
            document.getElementById('reg-responsavel').value = p.responsavel;
        } else {
            document.getElementById('div-responsavel').style.display = 'none';
            document.getElementById('div-responsavel-placeholder').style.display = 'block';
        }
        _enableVaccineFields();
        checkAgeConstraint(); updateSuggestedDate();
        if (document.getElementById('reg-vacina').value) autoFillVaccine();
        return;
    }
    // Paciente inválido ou apagado — limpa campos e bloqueia vacina
    document.getElementById('hidden-patient-id').value = '';
    _toggleBtnProntuario(false);
    document.getElementById('reg-cpf').value = '';
    document.getElementById('reg-dtnasc').value = '';
    document.getElementById('reg-idade').value = '';
    document.getElementById('reg-contato').value = '';
    document.getElementById('div-responsavel').style.display = 'none';
    document.getElementById('div-responsavel-placeholder').style.display = 'block';
    document.getElementById('reg-responsavel').value = '';
    _resetAndDisableVaccineFields();
}

function populateLoteSelect(vaccineId, selectedLoteId) {
    const sel = document.getElementById('reg-lote');
    sel.innerHTML = '<option value="">Selecione o lote...</option>';
    document.getElementById('reg-lote-validade-hint').classList.add('hidden');
    if (!vaccineId) return;
    const editingId = document.getElementById('reg-id')?.value;
    // Lotes abertos + o lote já vinculado a este agendamento (mesmo que tenha sido auto-fechado)
    const openLots = vaccineLots.filter(l =>
        l.vaccineId == vaccineId && (l.status === 'aberto' || l.id == selectedLoteId)
    ).sort((a, b) => new Date(a.validade) - new Date(b.validade));
    openLots.forEach(l => {
        const disp = (typeof getLoteDisponivelParaAgendamento === 'function')
            ? getLoteDisponivelParaAgendamento(l.id, editingId ? Number(editingId) : null) : null;
        const opt = document.createElement('option');
        opt.value = l.id;
        const dispStr = disp != null ? ` (disp: ${Math.max(0, disp)})` : '';
        opt.textContent = `Lote ${l.numero} — Val: ${l.validade.split('-').reverse().join('/')}${dispStr}`;
        opt.dataset.numero = l.numero;
        opt.dataset.validade = l.validade;
        if (disp != null) opt.dataset.disponivel = disp;
        // Lote sem estoque livre fica desabilitado (a menos que seja o lote já vinculado a este agendamento)
        if (disp != null && disp <= 0 && l.id != selectedLoteId) { opt.disabled = true; opt.textContent += ' — sem estoque'; }
        sel.appendChild(opt);
    });
    if (selectedLoteId) {
        sel.value = selectedLoteId;
        onLoteChange();
    }
}

function onLoteChange() {
    const sel = document.getElementById('reg-lote');
    const opt = sel.options[sel.selectedIndex];
    const validade = opt && opt.dataset.validade ? opt.dataset.validade : null;
    const hintEl = document.getElementById('reg-lote-validade-hint');
    const spanEl = document.getElementById('span-lote-validade');
    const erroEl = document.getElementById('reg-lote-vencido-erro');
    const submitBtn = document.querySelector('#record-form button[type="submit"]');

    // Fecha ambos os modais e reseta estado visual
    document.getElementById('modal-lote-expired-block').classList.remove('active');
    document.getElementById('modal-lote-expiry-warning').classList.remove('active');
    erroEl.classList.add('hidden');
    hintEl.classList.add('hidden');
    hintEl.style.color = '';
    sel.classList.remove('border-red-400');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('opacity-50', 'cursor-not-allowed'); }

    // Mostra disponibilidade de estoque do lote selecionado
    const estoqueHint = document.getElementById('reg-lote-estoque-hint');
    if (estoqueHint) {
        const loteIdSel = sel.value;
        if (loteIdSel && typeof getLoteDisponivelParaAgendamento === 'function') {
            const editingId = document.getElementById('reg-id')?.value;
            const disp = Math.max(0, getLoteDisponivelParaAgendamento(Number(loteIdSel), editingId ? Number(editingId) : null));
            document.getElementById('span-lote-disp').textContent = disp;
            estoqueHint.classList.toggle('text-red-600', disp <= 0);
            estoqueHint.classList.toggle('text-slate-500', disp > 0);
            estoqueHint.classList.remove('hidden');
        } else {
            estoqueHint.classList.add('hidden');
        }
    }

    if (!validade) return;

    spanEl.textContent = validade.split('-').reverse().join('/');
    hintEl.classList.remove('hidden');

    const expiryDate = new Date(validade + 'T00:00:00');

    // Data de referência: data agendada se preenchida, senão hoje
    const scheduledDateVal = document.getElementById('reg-data').value;
    const refDate = scheduledDateVal
        ? new Date(scheduledDateVal + 'T00:00:00')
        : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

    const twoMonthsFromRef = new Date(refDate);
    twoMonthsFromRef.setMonth(twoMonthsFromRef.getMonth() + 2);

    if (expiryDate < refDate) {
        // VENCIDO — abre modal vermelho, limpa seleção, bloqueia salvar
        const refLabel = scheduledDateVal
            ? `data agendada (<b>${scheduledDateVal.split('-').reverse().join('/')}</b>)`
            : `data de hoje`;
        document.getElementById('lote-expired-block-msg').innerHTML =
            `O lote <b>${opt.dataset.numero}</b> vence em <b>${validade.split('-').reverse().join('/')}</b>, anterior à ${refLabel}. Selecione outro lote ou cadastre um novo.`;
        document.getElementById('modal-lote-expired-block').classList.add('active');
        sel.value = '';
        hintEl.classList.add('hidden');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('opacity-50', 'cursor-not-allowed'); }

    } else if (expiryDate <= twoMonthsFromRef) {
        // A VENCER — abre modal amarelo, seleção permanece válida
        const diffDays = Math.ceil((expiryDate - refDate) / (1000 * 60 * 60 * 24));
        document.getElementById('lote-expiry-warning-msg').innerHTML =
            `O lote <b>${opt.dataset.numero}</b> está próximo do vencimento: <b>${validade.split('-').reverse().join('/')}</b> (em <b>${diffDays} dia(s)</b>). Utilize-o com prioridade antes que expire.`;
        document.getElementById('modal-lote-expiry-warning').classList.add('active');
        hintEl.style.color = '#d97706';
    }
}

function getEsquemaPaciente(v, dtNasc) {
    // Retorna o primeiro esquema que se encaixa na idade do paciente, ou null
    if (!v.esquemas || !v.esquemas.length) return null;
    if (!dtNasc) return v.esquemas[0];
    const ageInfo = getAgeInMonths(dtNasc);
    const totalMeses = ageInfo.years * 12 + ageInfo.months;
    return v.esquemas.find(esq => {
        if (esq.minAnos == null) return true;
        const minTotal = (esq.minAnos || 0) * 12 + (esq.minMeses || 0);
        const hasMax = esq.maxAnos != null || esq.maxMeses != null;
        const maxTotal = hasMax ? ((esq.maxAnos || 0) * 12 + (esq.maxMeses || 0)) : Infinity;
        return totalMeses >= minTotal && totalMeses <= maxTotal;
    }) || null;
}

function getEsquemasPaciente(v, dtNasc) {
    // Retorna TODOS os esquemas compatíveis com a idade do paciente
    if (!v.esquemas || !v.esquemas.length) return [];
    if (!dtNasc) return v.esquemas;
    const ageInfo = getAgeInMonths(dtNasc);
    const totalMeses = ageInfo.years * 12 + ageInfo.months;
    return v.esquemas.filter(esq => {
        if (esq.minAnos == null) return true;
        const minTotal = (esq.minAnos || 0) * 12 + (esq.minMeses || 0);
        const hasMax = esq.maxAnos != null || esq.maxMeses != null;
        const maxTotal = hasMax ? ((esq.maxAnos || 0) * 12 + (esq.maxMeses || 0)) : Infinity;
        return totalMeses >= minTotal && totalMeses <= maxTotal;
    });
}

function autoFillVaccine() {
    const vId = document.getElementById('reg-vacina').value;
    const doseSel = document.getElementById('reg-dose');
    doseSel.innerHTML = '<option value="">Selecione...</option>';
    document.getElementById('reg-idade-min').value = '';
    document.getElementById('reg-valor').value = '';
    populateLoteSelect(vId);

    if (vId) {
        const v = vaccines.find(x => x.id == vId);
        if (v) {
            // Determina doses de TODOS os esquemas compatíveis com a idade do paciente
            const dtNasc = document.getElementById('reg-dtnasc').value;
            const esqs = getEsquemasPaciente(v, dtNasc);
            const esq = esqs.length ? esqs[0] : null;
            // Coleta opções únicas de todos os esquemas compatíveis
            const doseOptions = new Set();
            const esqsToUse = esqs.length ? esqs : (v.esquemas && v.esquemas.length ? [v.esquemas[0]] : [{ numDoses: v.numDoses || 1 }]);
            esqsToUse.forEach(e => {
                const n = e.numDoses || 1;
                if (n === 1) {
                    doseOptions.add('__dose_unica__');
                } else {
                    for (let i = 1; i <= n; i++) doseOptions.add(i);
                }
            });
            // Renderiza: primeiro doses numeradas em ordem, depois dose única
            const numeradas = [...doseOptions].filter(d => d !== '__dose_unica__').sort((a, b) => a - b);
            numeradas.forEach(i => { doseSel.innerHTML += `<option value="${i}ª Dose">${i}ª Dose</option>`; });
            if (doseOptions.has('__dose_unica__')) {
                doseSel.innerHTML += `<option value="Dose Única">Dose Única</option>`;
            }
            // Reforço: aparece para todos os esquemas quando a vacina tem reforço
            if (v.reforco) doseSel.innerHTML += `<option value="Reforço">Reforço</option>`;

            // Label de faixas etárias
            let idadeMinStr = '';
            if (v.esquemas && v.esquemas.length > 0) {
                const faixas = v.esquemas.filter(e => e.minAnos != null).map(e => formatFaixaEtaria(e));
                idadeMinStr = faixas.length ? faixas.join(' | ') : 'Sem restrição';
            } else {
                idadeMinStr = 'Sem restrição';
            }
            document.getElementById('reg-idade-min').value = idadeMinStr;
            document.getElementById('reg-valor').value = String(v.valor || '').replace('R$', '').trim();
            resetDescontoUI();
            checkAgeConstraint();
            updateSuggestedDate();
        }
    }
}


function checkAgeConstraint() {
    const vId = document.getElementById('reg-vacina').value;
    const dtNasc = document.getElementById('reg-dtnasc').value;
    if (!vId || !dtNasc) return false;
    const v = vaccines.find(x => x.id == vId);
    if (!v) return false;
    const ageInfo = getAgeInMonths(dtNasc);
    const patientTotalMeses = ageInfo.years * 12 + ageInfo.months;

    // Se há esquemas por faixa etária, verifica se o paciente se encaixa em algum
    if (v.esquemas && v.esquemas.length > 0) {
        const encaixa = v.esquemas.some(esq => {
            if (esq.minAnos == null) return true;
            const minTotal = (esq.minAnos || 0) * 12 + (esq.minMeses || 0);
            const hasMax = esq.maxAnos != null || esq.maxMeses != null;
            const maxTotal = hasMax ? ((esq.maxAnos || 0) * 12 + (esq.maxMeses || 0)) : Infinity;
            return patientTotalMeses >= minTotal && patientTotalMeses <= maxTotal;
        });
        if (!encaixa) {
            const faixas = v.esquemas.filter(esq => esq.minAnos != null).map(esq => formatFaixaEtaria(esq)).join('; ');
            const patStr = ageInfo.years > 0 ? `${ageInfo.years} ano(s) e ${ageInfo.months} mês(es)` : `${ageInfo.months} mês(es)`;
            document.getElementById('age-warning-msg').innerHTML = `O paciente possui <b>${patStr}</b> e não se enquadra em nenhuma faixa etária cadastrada para a vacina <b>${v.nome}</b>.<br><br><span class="text-[11px] text-slate-500">Faixas permitidas: <b>${faixas || 'Não definidas'}</b></span><br><br>O agendamento desta vacina para este paciente <b>não é permitido</b>.`;
            document.getElementById('modal-age-warning').classList.add('active');
            return true;
        }
        return false;
    }

    // Fallback: usa idadeMinimaAnos/Meses
    const minAgeInMonths = (v.idadeMinimaAnos || 0) * 12 + (v.idadeMinimaMeses || 0);
    if (patientTotalMeses < minAgeInMonths) {
        const minStr = v.idadeMinimaAnos > 0 && v.idadeMinimaMeses > 0 ? `${v.idadeMinimaAnos} ano(s) e ${v.idadeMinimaMeses} mês(es)`
            : v.idadeMinimaAnos > 0 ? `${v.idadeMinimaAnos} ano(s)` : `${v.idadeMinimaMeses} mês(es)`;
        const patStr = ageInfo.years > 0 && ageInfo.months > 0 ? `${ageInfo.years} ano(s) e ${ageInfo.months} mês(es)`
            : ageInfo.years > 0 ? `${ageInfo.years} ano(s)` : `${ageInfo.months} mês(es)`;
        document.getElementById('age-warning-msg').innerHTML = `O paciente possui <b>${patStr}</b>, porém a idade mínima para a vacina <b>${v.nome}</b> é de <b>${minStr}</b>.<br><br>O agendamento desta vacina para este paciente <b>não é permitido</b>.`;
        document.getElementById('modal-age-warning').classList.add('active');
        return true;
    }
    return false;
}

function updateSuggestedDate() {
    const patId  = document.getElementById('hidden-patient-id').value;
    const vId    = document.getElementById('reg-vacina').value;
    const dose   = document.getElementById('reg-dose').value;
    const sugDiv = document.getElementById('sugestao-data');
    const spanEl = document.getElementById('span-sugestao-data');

    sugDiv.classList.add('hidden');
    document.getElementById('reg-data').removeAttribute('min');

    if (!patId || !vId || !dose || dose.includes('1ª')) return;

    const v = vaccines.find(x => String(x.id) === String(vId));
    if (!v) return;

    // Reforço: sugere data com base na última dose (não-reforço) + reforcoMeses meses
    if (dose === 'Reforço') {
        if (!v.reforco || !(v.reforcoMeses > 0)) return;

        const editingId = document.getElementById('reg-id').value;
        const prevApps = appointments.filter(a =>
            String(a.patientId) === String(patId) &&
            String(a.vaccineId) === String(vId) &&
            (!editingId || String(a.id) !== String(editingId)) &&
            a.doseAtual !== 'Reforço'
        ).sort((a, b) => new Date(b.data) - new Date(a.data));

        if (!prevApps.length) return;

        const baseDate = new Date(prevApps[0].data + 'T00:00:00');
        baseDate.setMonth(baseDate.getMonth() + v.reforcoMeses);
        const isoDate = baseDate.toISOString().split('T')[0];

        spanEl.innerText = isoDate.split('-').reverse().join('/');
        spanEl.setAttribute('data-iso', isoDate);
        document.getElementById('reg-data').min = isoDate;
        sugDiv.classList.remove('hidden');
        return;
    }

    // Dose Única recorrente: sugerir próxima data com base no repeteMeses do esquema
    if (dose === 'Dose Única') {
        const dtNasc = document.getElementById('reg-dtnasc').value;
        const esqs = getEsquemasPaciente(v, dtNasc);
        const esqRepete = esqs.find(e => e.numDoses === 1 && e.repete && e.repeteMeses > 0);
        if (!esqRepete) return;

        const editingId = document.getElementById('reg-id').value;
        const prevApps = appointments.filter(a =>
            String(a.patientId) === String(patId) &&
            String(a.vaccineId) === String(vId) &&
            (!editingId || String(a.id) !== String(editingId)) &&
            a.doseAtual === 'Dose Única'
        ).sort((a, b) => new Date(b.data) - new Date(a.data));

        if (!prevApps.length) return;

        const baseDate = new Date(prevApps[0].data + 'T00:00:00');
        baseDate.setMonth(baseDate.getMonth() + esqRepete.repeteMeses);
        const isoDate = baseDate.toISOString().split('T')[0];

        spanEl.innerText = isoDate.split('-').reverse().join('/');
        spanEl.setAttribute('data-iso', isoDate);
        document.getElementById('reg-data').min = isoDate;
        sugDiv.classList.remove('hidden');
        return;
    }

    const doseNum = Number((dose.match(/(\d+)/) || [])[1] || 2);
    if (doseNum < 2) return;

    const editingId = document.getElementById('reg-id').value;

    // Base = dose anterior específica (doseNum-1), a mais recente caso haja repetições.
    const prevDoseStr = `${doseNum - 1}ª Dose`;
    const prevApps = appointments.filter(a =>
        String(a.patientId) === String(patId) &&
        String(a.vaccineId) === String(vId)   &&
        (!editingId || String(a.id) !== String(editingId)) &&
        a.doseAtual === prevDoseStr
    ).sort((a, b) => new Date(b.data) - new Date(a.data));

    console.debug('[aprazamento] patId', patId, 'vId', vId, 'dose', dose, 'prevApps', prevApps.length, prevApps.map(a => a.doseAtual + ' ' + a.data));

    if (!prevApps.length) return;

    // Usa o agendamento mais recente como base
    const baseApp = prevApps[0];

    // Intervalo do esquema adequado ao paciente
    const dtNasc   = document.getElementById('reg-dtnasc').value;
    const esq      = getEsquemaPaciente(v, dtNasc);
    const intervalos = (esq && esq.intervalos && esq.intervalos.length)
        ? esq.intervalos
        : (v.intervalos && v.intervalos.length
            ? v.intervalos
            : (v.intervaloDias > 0 ? [v.intervaloDias] : []));

    console.debug('[aprazamento] esq', esq, 'intervalos', intervalos, 'doseNum', doseNum);

    let intervalo = intervalos.length
        ? (intervalos[doseNum - 2] != null ? intervalos[doseNum - 2] : intervalos[intervalos.length - 1])
        : 0;

    // Fallback p/ vacinas legadas salvas sem intervalos: usa default de 30 dias
    // para que o aprazamento ainda seja sugerido a partir da dose anterior.
    if (!intervalo || intervalo <= 0) intervalo = 30;

    console.debug('[aprazamento] intervalo', intervalo, 'baseApp.data', baseApp.data);

    const baseDate = new Date(baseApp.data + 'T00:00:00');
    baseDate.setDate(baseDate.getDate() + intervalo);
    const isoDate  = baseDate.toISOString().split('T')[0];

    spanEl.innerText = isoDate.split('-').reverse().join('/');
    spanEl.setAttribute('data-iso', isoDate);
    document.getElementById('reg-data').min = isoDate;
    sugDiv.classList.remove('hidden');
}

function applySuggestedDate() {
    const iso = document.getElementById('span-sugestao-data').getAttribute('data-iso');
    if(iso) document.getElementById('reg-data').value = iso;
}

function confirmarSalvarMesmoAssim() {
    document.getElementById('modal-aprazamento-aviso').classList.remove('active');
}

// ─── DESCONTO NO AGENDAMENTO ──────────────────────────────────────────────────
function openDescontoModal() {
    const valorAtual = document.getElementById('reg-valor').value;
    if (!valorAtual || valorAtual === '0,00') {
        showNotification('Selecione uma vacina antes de aplicar desconto.', 'error');
        return;
    }
    // Usa o valor cheio real (sem desconto anterior)
    const base = _descontoAtivo ? _valorCheio : valorAtual;
    document.getElementById('modal-desc-valor-cheio').textContent = 'R$ ' + base;
    document.getElementById('desc-pct-input').value = '';
    document.getElementById('desc-val-input').value = '';
    document.getElementById('desc-preview').classList.add('hidden');
    switchDescontoTab('pct');
    document.getElementById('modal-desconto').classList.add('active');
}

function switchDescontoTab(tab) {
    _descontoTab = tab;
    const isPct = tab === 'pct';
    document.getElementById('desc-pct-panel').classList.toggle('hidden', !isPct);
    document.getElementById('desc-val-panel').classList.toggle('hidden', isPct);
    document.getElementById('tab-desc-pct').className = `flex-1 py-2 transition text-[11px] font-black uppercase ${isPct ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`;
    document.getElementById('tab-desc-val').className = `flex-1 py-2 transition text-[11px] font-black uppercase ${!isPct ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`;
    document.getElementById('desc-preview').classList.add('hidden');
}

function setDescontoPct(pct) {
    document.getElementById('desc-pct-input').value = pct;
    calcDescontoPreview();
}

function calcDescontoPreview() {
    const base = _descontoAtivo ? _valorCheio : document.getElementById('reg-valor').value;
    const baseNum = parseBRL(base);
    if (!baseNum) return;

    let finalNum = 0, pct = 0;
    if (_descontoTab === 'pct') {
        pct = parseFloat(document.getElementById('desc-pct-input').value) || 0;
        if (pct < 0 || pct > 100) return;
        finalNum = baseNum * (1 - pct / 100);
    } else {
        finalNum = parseBRL(document.getElementById('desc-val-input').value);
        if (finalNum < 0 || finalNum > baseNum) return;
        pct = baseNum > 0 ? ((baseNum - finalNum) / baseNum) * 100 : 0;
    }

    const economia = baseNum - finalNum;
    document.getElementById('desc-preview-valor').textContent = 'R$ ' + formatBRL(finalNum);
    document.getElementById('desc-preview-pct').textContent = pct.toFixed(1).replace('.', ',') + '% OFF';
    document.getElementById('desc-preview-economia').textContent = 'R$ ' + formatBRL(economia);
    document.getElementById('desc-preview').classList.remove('hidden');
}

function aplicarDesconto() {
    const base = _descontoAtivo ? _valorCheio : document.getElementById('reg-valor').value;
    const baseNum = parseBRL(base);
    let finalNum = 0, pct = 0;

    if (_descontoTab === 'pct') {
        pct = parseFloat(document.getElementById('desc-pct-input').value) || 0;
        if (pct <= 0 || pct > 100) { showNotification('Informe um percentual entre 0,1% e 100%.', 'error'); return; }
        finalNum = baseNum * (1 - pct / 100);
    } else {
        finalNum = parseBRL(document.getElementById('desc-val-input').value);
        if (finalNum <= 0 || finalNum > baseNum) { showNotification('Informe um valor final válido.', 'error'); return; }
        pct = baseNum > 0 ? ((baseNum - finalNum) / baseNum) * 100 : 0;
    }

    _valorCheio = base;
    _descontoAtivo = true;
    document.getElementById('reg-valor').value = formatBRL(finalNum);
    // Atualiza info abaixo do campo
    document.getElementById('reg-valor-cheio-display').textContent = 'R$ ' + _valorCheio;
    document.getElementById('reg-desconto-pct-display').textContent = pct.toFixed(1).replace('.', ',') + '% OFF';
    document.getElementById('reg-desconto-info').classList.remove('hidden');
    // Estilo do campo: destaque indigo
    document.getElementById('btn-desconto').classList.add('ring-2', 'ring-indigo-400');
    document.getElementById('modal-desconto').classList.remove('active');
    showNotification('Desconto aplicado com sucesso!', 'success');
}

function removerDesconto() {
    if (!_descontoAtivo) return;
    document.getElementById('reg-valor').value = _valorCheio;
    _descontoAtivo = false;
    _valorCheio = '';
    document.getElementById('reg-desconto-info').classList.add('hidden');
    document.getElementById('btn-desconto').classList.remove('ring-2', 'ring-indigo-400');
}

function resetDescontoUI() {
    _descontoAtivo = false;
    _valorCheio = '';
    document.getElementById('reg-desconto-info').classList.add('hidden');
    document.getElementById('btn-desconto').classList.remove('ring-2', 'ring-indigo-400');
}

function confirmarDoseAnterior() {
    document.getElementById('modal-dose-anterior-aviso').classList.remove('active');
    window._doseAnteriorConfirmado = true;
    document.getElementById('record-form').requestSubmit();
}

function openDeleteModal(id) {
    if(!id) return;
    if (!checkPerm('excluir_agendamento')) return;
    const _appToDelete = appointments.find(x => x.id == id);
    if (_appToDelete && _appToDelete.status === 'Aplicado') {
        showNotification('Vacinas com status <b>Aplicado</b> não podem ser excluídas.', 'error');
        return;
    }
    pendingDeleteId = Number(id);
    const a = appointments.find(x=>x.id==pendingDeleteId);
    const p = a ? patients.find(x=>x.id==a.patientId) : null;
    const v = a ? vaccines.find(x=>x.id==a.vaccineId) : null;
    document.getElementById('delete-confirm-info').innerText = p && v ? `${p.nome} — ${v.nome} (${a.doseAtual}) em ${a.data.split('-').reverse().join('/')}` : '';
    document.getElementById('delete-confirm-input').value = '';
    checkDeleteConfirm();
    document.getElementById('modal-delete-confirm').classList.add('active');
}

function checkDeleteConfirm() {
    const val = document.getElementById('delete-confirm-input').value.trim().toUpperCase();
    const btn = document.getElementById('btn-confirm-delete');
    const ok = val === 'SIM';
    btn.disabled = !ok;
    btn.className = ok
        ? 'flex-1 bg-red-600 text-white font-black py-3 rounded-xl uppercase text-xs transition hover:bg-red-700 cursor-pointer shadow-md'
        : 'flex-1 bg-red-200 text-red-400 font-black py-3 rounded-xl uppercase text-xs transition cursor-not-allowed';
}

function confirmDeleteRecord() {
    if(!pendingDeleteId) return;
    const a = appointments.find(x => x.id === pendingDeleteId);
    const pat = a ? patients.find(p => p.id == a.patientId) : null;
    const vac = a ? vaccines.find(v => v.id == a.vaccineId) : null;
    logAudit('Excluído', 'agendamento', pendingDeleteId,
        `${pat ? pat.nome : '—'} | ${vac ? vac.nome : '—'} | ${a ? a.doseAtual : ''} | ${a ? a.data : ''}`);
    appointments = appointments.filter(x=>x.id !== pendingDeleteId);
    if (typeof stockMovements !== 'undefined') stockMovements = stockMovements.filter(m => m.appointmentId != pendingDeleteId);
    pendingDeleteId = null;
    document.getElementById('modal-delete-confirm').classList.remove('active');
    document.getElementById('delete-confirm-input').value = '';
    if (typeof syncAllLoteStatus === 'function') syncAllLoteStatus();
    saveAll(); renderCalendar(); renderTable(); renderDashboard(); renderPatients(); closeModals();
    if (typeof refreshAlmoxIfActive === 'function') refreshAlmoxIfActive();
    if (typeof refreshOpenModals === 'function') refreshOpenModals();
    const _oppElDel = document.getElementById('agendaview-oportunidades');
    if (_oppElDel && !_oppElDel.classList.contains('hidden') && typeof renderOportunidades === 'function') renderOportunidades();
    showNotification('Agendamento excluído com sucesso.', 'success');
}

function editRecord(id) {
    if (!isCurrentUserAdmin() && !hasPerm('agendar') && !hasPerm('criar_agendamento')) {
        showNotification('Acesso negado: você não tem permissão para visualizar agendamentos.', 'error');
        return;
    }
    const canEdit = isCurrentUserAdmin() || hasPerm('criar_agendamento');
    closeModals();
    // Reseta estados globais
    window._doseAnteriorConfirmado = false;
    window._pendingDoseAnteriorEvent = null;
    // Setup modal sem checar permissão de criação
    document.getElementById('record-form').reset();
    // Limpa inputs hidden que não são resetados automaticamente
    document.getElementById('reg-vacina').value = '';
    document.getElementById('hidden-patient-id').value = '';
    // Limpa o dropdown de vacina para evitar sobreposição visual
    const _vacinaDropdownEdit = document.getElementById('vacina-dropdown');
    if (_vacinaDropdownEdit) { _vacinaDropdownEdit.innerHTML = ''; _vacinaDropdownEdit.classList.add('hidden'); }
    // Limpa todos os modais de aviso anteriores
    document.getElementById('modal-age-warning')?.classList.remove('active');
    document.getElementById('modal-aprazamento-aviso')?.classList.remove('active');
    document.getElementById('modal-dose-anterior-aviso')?.classList.remove('active');
    document.getElementById('modal-lote-expired-block')?.classList.remove('active');
    document.getElementById('modal-lote-expiry-warning')?.classList.remove('active');
    const _chkOutroLocalEdit = document.getElementById('reg-aplicada-outro-local');
    if (_chkOutroLocalEdit) { _chkOutroLocalEdit.checked = false; toggleAplicadaOutroLocal(_chkOutroLocalEdit); }
    document.getElementById('reg-id').value = '';
    document.getElementById('hidden-patient-id').value = '';
    _toggleBtnProntuario(false);
    document.getElementById('div-responsavel').style.display = 'none';
    document.getElementById('div-responsavel-placeholder').style.display = 'block';
    document.getElementById('div-motivo-cancelamento').style.display = 'none';
    document.getElementById('sugestao-data').classList.add('hidden');
    document.getElementById('reg-data').removeAttribute('min');
    document.getElementById('reg-lote-validade-hint').classList.add('hidden');
    const _estoqueHintEdit = document.getElementById('reg-lote-estoque-hint');
    if (_estoqueHintEdit) _estoqueHintEdit.classList.add('hidden');
    document.getElementById('lbl-lote').innerText = 'Lote';
    document.getElementById('reg-lote').required = false;
    document.getElementById('reg-lote').classList.add('border-slate-200');
    document.getElementById('reg-lote').classList.remove('border-clinic-300', 'ring-2', 'ring-clinic-100');
    document.getElementById('lbl-aplicador').innerText = 'Aplicador';
    document.getElementById('reg-aplicador').required = false;
    populatePatientDatalist(); populateVaccineSelects(); populateCancelReasons(); populateLoteSelect(null);
    document.getElementById('btn-delete-record').classList.add('hidden');

    const a = appointments.find(x=>x.id==id);
    if(!a) return;
    const p = patients.find(x=>x.id==a.patientId);

    document.getElementById('reg-id').value = a.id;
    document.getElementById('reg-patient-search').value = p ? `${p.cpf} - ${p.nome}` : '';
    autoFillPatient();

    setTimeout(() => {
        // Limpa completamente os campos de vacina ANTES de preencher com novos dados
        document.getElementById('reg-vacina').value = '';
        document.getElementById('reg-vacina-search').value = '';
        
        // Preenche com a nova vacina
        const _vac = vaccines.find(x => x.id == a.vaccineId);
        document.getElementById('reg-vacina').value = a.vaccineId;
        document.getElementById('reg-vacina-search').value = _vac ? _vac.nome : '';
        autoFillVaccine();

        document.getElementById('reg-dose').value = a.doseAtual;
        updateSuggestedDate();
        document.getElementById('reg-data').value = a.data;
        document.getElementById('reg-hora').value = a.hora || '';
        document.getElementById('reg-valor').value = String(a.valorAplicado || '').replace('R$', '').trim();
        // Restaura estado de desconto
        if (a.valorCheio && a.descontoPct) {
            _descontoAtivo = true;
            _valorCheio = String(a.valorCheio).replace('R$', '').trim();
            document.getElementById('reg-valor-cheio-display').textContent = 'R$ ' + _valorCheio;
            document.getElementById('reg-desconto-pct-display').textContent = String(a.descontoPct).replace('.', ',') + '% OFF';
            document.getElementById('reg-desconto-info').classList.remove('hidden');
            document.getElementById('btn-desconto').classList.add('ring-2', 'ring-indigo-400');
        } else {
            resetDescontoUI();
        }
        document.getElementById('reg-status').value = a.status;
        populateLoteSelect(a.vaccineId, a.loteId);
        toggleCancelReason();
        if(a.status === 'Perdido') document.getElementById('reg-motivo-cancelamento').value = a.motivoCancelamento || '';
        document.getElementById('reg-pedido').value = a.pedido || a.pedidoNumero || '';
        document.getElementById('reg-vendedor').value = a.vendedor || '';
        document.getElementById('reg-aplicador').value = a.aplicador || '';
        const chkOutroLocal = document.getElementById('reg-aplicada-outro-local');
        if(chkOutroLocal) { chkOutroLocal.checked = !!a.aplicadaOutroLocal; toggleAplicadaOutroLocal(chkOutroLocal); }

        if (canEdit) {
            document.getElementById('modal-title-agenda').innerText = 'Editar Agendamento';
            if (a.status === 'Aplicado') {
                document.getElementById('btn-delete-record').classList.add('hidden');
            } else {
                document.getElementById('btn-delete-record').classList.remove('hidden');
            }
            document.getElementById('btn-duplicar-record').classList.remove('hidden');
            document.querySelectorAll('#record-form input:not([type="hidden"]):not(#reg-valor), #record-form select, #record-form textarea').forEach(el => { el.disabled = false; });
            document.getElementById('btn-desconto').disabled = false;
            const saveBtn = document.querySelector('#record-form button[type="submit"]');
            if (saveBtn) saveBtn.style.display = '';
        } else {
            document.getElementById('modal-title-agenda').innerText = 'Visualizar Agendamento';
            document.getElementById('btn-delete-record').classList.add('hidden');
            document.getElementById('btn-duplicar-record').classList.add('hidden');
            document.querySelectorAll('#record-form input:not([type="hidden"]):not(#reg-valor), #record-form select, #record-form textarea').forEach(el => { el.disabled = true; });
            document.getElementById('btn-desconto').disabled = true;
            const saveBtn = document.querySelector('#record-form button[type="submit"]');
            if (saveBtn) saveBtn.style.display = 'none';
        }
        document.getElementById('modal-record').classList.add('active');
    }, 50);
}

function duplicarAgendamento() {
    // Captura dados ANTES de resetar o formulário
    const patientId = document.getElementById('hidden-patient-id').value;
    const p         = patients.find(x => x.id == patientId);
    const vacinaId  = document.getElementById('reg-vacina').value;
    const valor     = document.getElementById('reg-valor').value;
    const vendedor  = document.getElementById('reg-vendedor').value;
    const data      = document.getElementById('reg-data').value;
    const hora      = document.getElementById('reg-hora').value;
    const pedido    = document.getElementById('reg-pedido').value;
    const status    = document.getElementById('reg-status').value;

    openRecordModal();

    setTimeout(() => {
        // Paciente — preenche diretamente todos os campos sem depender de busca textual
        if (p) {
            const psEl = document.getElementById('reg-patient-search');
            psEl.value = `${p.cpf} - ${p.nome}`;
            psEl.setCustomValidity('');
            psEl.classList.remove('border-red-400');
            psEl.classList.add('border-slate-200');
            document.getElementById('hidden-patient-id').value = p.id;
            document.getElementById('reg-cpf').value     = p.cpf;
            document.getElementById('reg-dtnasc').value  = p.dtNasc;
            updateIdadeField();
            document.getElementById('reg-contato').value = formatPhone(p.contato);
            if (p.responsavel) {
                document.getElementById('div-responsavel').style.display = 'block';
                document.getElementById('div-responsavel-placeholder').style.display = 'none';
                document.getElementById('reg-responsavel').value = p.responsavel;
            }
            if (typeof checkAgeConstraint === 'function') checkAgeConstraint();
            _enableVaccineFields();
        }

        // Vacina, custo e vendedor
        const _vacDup = vaccines.find(x => x.id == vacinaId);
        document.getElementById('reg-vacina').value = vacinaId;
        document.getElementById('reg-vacina-search').value = _vacDup ? _vacDup.nome : '';
        document.getElementById('reg-valor').value    = valor;
        document.getElementById('reg-vendedor').value = vendedor;

        // Data, hora, número do pedido e status
        document.getElementById('reg-data').value   = data;
        document.getElementById('reg-hora').value   = hora;
        if (pedido) {
            document.getElementById('reg-pedido').value = pedido;
        }
        if (status) {
            document.getElementById('reg-status').value = status;
            // Atualiza os campos obrigatórios baseado no status
            if (typeof toggleCancelReason === 'function') toggleCancelReason();
        }

        // autoFillVaccine preenche dose/lote e aciona updateSuggestedDate
        if (typeof autoFillVaccine === 'function') autoFillVaccine();

        document.getElementById('modal-title-agenda').innerText = 'Novo Agendamento (Duplicado)';
    }, 120);
}

function toggleCancelReason() {
    const statusSel = document.getElementById('reg-status');
    const s = statusSel.value;
    const avisoEl = document.getElementById('aviso-sem-perm-aplicado');

    if (s === 'Aplicado' && !isCurrentUserAdmin() && !hasPerm('aplicar')) {
        statusSel.value = 'Agendado';
        avisoEl.classList.remove('hidden');
        setTimeout(() => avisoEl.classList.add('hidden'), 5000);
        toggleCancelReason();
        return;
    }
    avisoEl.classList.add('hidden');

    const div = document.getElementById('div-motivo-cancelamento');
    const sel = document.getElementById('reg-motivo-cancelamento');
    const outroLocal = document.getElementById('reg-aplicada-outro-local');
    const isOutroLocal = outroLocal && outroLocal.checked;
    if (s === 'Perdido') {
        div.style.display = 'flex';
        sel.disabled = isOutroLocal;
        sel.required = !isOutroLocal;
        sel.classList.toggle('opacity-40', isOutroLocal);
        sel.classList.toggle('cursor-not-allowed', isOutroLocal);
        sel.classList.toggle('bg-slate-100', isOutroLocal);
        if (isOutroLocal) sel.value = '';
    } else {
        div.style.display = 'none'; sel.required = false; sel.disabled = false; sel.value = '';
    }

    const loteSel = document.getElementById('reg-lote');
    const loteLabel = document.getElementById('lbl-lote');
    const aplicadorInput = document.getElementById('reg-aplicador');
    const aplicadorLabel = document.getElementById('lbl-aplicador');
    const pedidoInput = document.getElementById('reg-pedido');
    const pedidoLabel = document.getElementById('lbl-pedido');

    if (s === 'Agendado' || s === 'Aplicado') {
        if (pedidoInput) pedidoInput.required = true;
        if (pedidoLabel) pedidoLabel.innerHTML = 'Nº Pedido <span class="text-red-500">*</span>';
    } else {
        if (pedidoInput) pedidoInput.required = false;
        if (pedidoLabel) pedidoLabel.innerText = 'Nº Pedido';
    }

    if(s === 'Aplicado') {
        loteSel.required = true;
        loteLabel.innerHTML = 'Lote <span class="text-red-500">*</span>';
        loteSel.classList.remove('border-slate-200');
        loteSel.classList.add('border-clinic-300', 'ring-2', 'ring-clinic-100');
        aplicadorInput.required = true;
        aplicadorLabel.innerHTML = 'Aplicador <span class="text-red-500">*</span>';
    } else {
        loteSel.required = false;
        loteLabel.innerText = 'Lote';
        loteSel.classList.add('border-slate-200');
        loteSel.classList.remove('border-clinic-300', 'ring-2', 'ring-clinic-100');
        aplicadorInput.required = false;
        aplicadorLabel.innerText = 'Aplicador';
    }
}

function toggleAplicadaOutroLocal(chk) {
    const icon = document.getElementById('icon-aplicada-outro-local');
    const box  = chk.closest('label') && chk.closest('label').querySelector('div');

    if (chk.checked) {
        if (icon) { icon.classList.remove('text-violet-400'); icon.classList.add('text-white'); }
        if (box)  { box.classList.add('bg-violet-600', 'border-violet-600'); box.classList.remove('bg-violet-50', 'border-violet-300'); }
    } else {
        if (icon) { icon.classList.add('text-violet-400'); icon.classList.remove('text-white'); }
        if (box)  { box.classList.remove('bg-violet-600', 'border-violet-600'); box.classList.add('bg-violet-50', 'border-violet-300'); }
    }
    toggleCancelReason();
}

// ─── MOTIVOS DE CANCELAMENTO (CRUD) ───────────────────────────────────────────
function openCancelReasonsModal() {
    renderCancelReasons();
    document.getElementById('modal-cancel-reasons').classList.add('active');
}

function renderCancelReasons() {
    const list = document.getElementById('reasons-list');
    list.innerHTML = cancelReasons.map((r, i) => `
        <li class="py-3 px-2 flex justify-between items-center hover:bg-slate-50 transition rounded-lg">
            <span class="text-sm font-bold text-slate-700">${r}</span>
            <div class="flex gap-2">
                <button onclick="editReason(${i})" class="h-8 w-8 bg-blue-50 text-blue-500 rounded hover:bg-blue-500 hover:text-white transition"><i class="fas fa-pen text-xs"></i></button>
                <button onclick="deleteReason(${i})" class="h-8 w-8 bg-red-50 text-red-500 rounded hover:bg-red-500 hover:text-white transition"><i class="fas fa-trash text-xs"></i></button>
            </div>
        </li>
    `).join('');
    populateCancelReasons();
    // Atualiza o select do modal de cancelamento do kanban se estiver aberto
    const kanbanSel = document.getElementById('kanban-cancel-reason');
    if (kanbanSel) {
        const cur = kanbanSel.value;
        kanbanSel.innerHTML = '<option value="">Selecione o motivo...</option>' + cancelReasons.map(r=>`<option value="${r}">${r}</option>`).join('');
        if (cur) kanbanSel.value = cur;
    }
}

function addNewReason() {
    const val = document.getElementById('new-reason-input').value.trim();
    if(val) {
        cancelReasons.push(val);
        document.getElementById('new-reason-input').value = '';
        saveAll(); renderCancelReasons(); showNotification('Motivo adicionado!', 'success');
    }
}

function editReason(i) {
    const newVal = prompt('Editar motivo:', cancelReasons[i]);
    if(newVal && newVal.trim()) {
        cancelReasons[i] = newVal.trim();
        saveAll(); renderCancelReasons(); showNotification('Motivo editado com sucesso', 'success');
    }
}

function deleteReason(i) {
    showConfirmDanger('Excluir este motivo definitivamente?', () => {
        cancelReasons.splice(i, 1);
        saveAll(); renderCancelReasons(); showNotification('Motivo excluído', 'success');
    });
}

function saveRecord(e) {
    e.preventDefault();
    const id = document.getElementById('reg-id').value;
    const patId = document.getElementById('hidden-patient-id').value;
    // Verifica se existe paciente válido selecionado no dropdown customizado
    if(!patId || !patients.find(x => x.id == patId)) {
        showNotification('Selecione um paciente válido da lista.','error');
        return;
    }

    const dateVal = document.getElementById('reg-data').value;
    // Validação de Domingo e Feriado
    const dObj = new Date(dateVal + "T00:00:00");
    if(dObj.getDay() === 0) {
        showNotification('Bloqueio clínico: Agendamentos aos domingos não são permitidos.', 'error');
        return;
    }
    if(holidays.includes(dateVal)) {
        showNotification('Bloqueio: O dia selecionado está marcado como feriado.', 'error');
        return;
    }

    // Bloqueio de horário: se preenchido, deve ser entre 07:00 e 17:00
    {
        const horaAgend = document.getElementById('reg-hora').value;
        if (horaAgend) {
            const [h, m] = horaAgend.split(':').map(Number);
            const totalMin = h * 60 + m;
            if (totalMin < 7 * 60 || totalMin > 17 * 60) {
                showNotification('Bloqueio: o horário deve estar entre 07:00 e 17:00.', 'error');
                return;
            }
        }
    }

    // Verificação de faixa etária — bloqueante
    if (checkAgeConstraint()) return;

    // Verificação de aprazamento — bloqueante (sem opção de continuar)
    {
        const vIdApr = document.getElementById('reg-vacina').value;
        const doseApr = document.getElementById('reg-dose').value;
        if (vIdApr && doseApr && !doseApr.includes('1ª') && doseApr !== 'Dose Única' && doseApr !== 'Reforço') {
            const vApr = vaccines.find(x => x.id == vIdApr);
            const dtNascApr = document.getElementById('reg-dtnasc').value;
            const esqApr = getEsquemaPaciente(vApr, dtNascApr);
            const intervalosApr = (esqApr && esqApr.intervalos && esqApr.intervalos.length) ? esqApr.intervalos
                : (vApr && vApr.intervalos && vApr.intervalos.length ? vApr.intervalos : (vApr && vApr.intervaloDias > 0 ? [vApr.intervaloDias] : []));
            if (intervalosApr.length) {
                const doseNumApr = (doseApr.match(/(\d+)/) || [])[1];
                const dNum = doseNumApr ? Number(doseNumApr) : 2;
                const intervaloApr = intervalosApr[dNum - 2] ?? intervalosApr[intervalosApr.length - 1];
                if (intervaloApr > 0) {
                    const prevDoseStrApr = `${dNum - 1}ª Dose`;
                    const prevAppsApr = appointments.filter(a =>
                            String(a.patientId) === String(patId) && String(a.vaccineId) === String(vIdApr) && a.doseAtual === prevDoseStrApr && String(a.id) !== String(id))
                        .sort((a, b) => new Date(b.data) - new Date(a.data));
                    if (prevAppsApr.length > 0) {
                        const baseApr = new Date(prevAppsApr[0].data + 'T00:00:00');
                        baseApr.setDate(baseApr.getDate() + intervaloApr);
                        const minDateIso = baseApr.toISOString().split('T')[0];
                        if (dateVal < minDateIso) {
                            const minBr = minDateIso.split('-').reverse().join('/');
                            const prevBr = prevAppsApr[0].data.split('-').reverse().join('/');
                            const diffMs = baseApr - new Date(dateVal + 'T00:00:00');
                            const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                            document.getElementById('aprazamento-aviso-msg').innerHTML =
                                `A data agendada é anterior ao prazo recomendado.<br><br>
                                <span class="text-slate-500 text-xs">Última dose registrada: <b>${prevBr}</b></span><br>
                                <span class="text-slate-500 text-xs">Intervalo recomendado: <b>${intervaloApr} dias</b></span><br>
                                <span class="text-slate-500 text-xs">Diferença: <b class="text-red-600">${diffDias} dia${diffDias !== 1 ? 's' : ''} antes do permitido</b></span><br><br>
                                <span class="font-black text-red-600 text-xs">Data mínima: ${minBr}</span>`;
                            document.getElementById('modal-aprazamento-aviso').classList.add('active');
                            return;
                        }
                    }
                }
            }
        }
    }

    // Verificação de intervalo de 1 hora entre agendamentos no mesmo dia
    {
        const horaVal = document.getElementById('reg-hora') ? document.getElementById('reg-hora').value : null;
        if (horaVal) {
            const conflito = appointments.find(a => a.id != id && a.data === dateVal && a.hora && Math.abs(
                (parseInt(horaVal.split(':')[0])*60 + parseInt(horaVal.split(':')[1])) -
                (parseInt(a.hora.split(':')[0])*60 + parseInt(a.hora.split(':')[1]))
            ) < 30);
            if (conflito && conflito.patientId != patId) { // Allow same patient multiple appointments at same time
                const p2 = patients.find(x => x.id == conflito.patientId);
                const v2 = vaccines.find(x => x.id == conflito.vaccineId);
                showNotification(`Conflito de horário: já existe agendamento às ${conflito.hora} para ${p2 ? p2.nome : 'outro paciente'} (${v2 ? v2.nome : ''}). O intervalo mínimo entre agendamentos é de 30 minutos.`, 'error');
                return;
            }
        }
    }

    const vId = document.getElementById('reg-vacina').value;
    const doseAtualStr = document.getElementById('reg-dose').value;

    // Bloqueio de duplicidade: mesma vacina + mesma dose já registrada (não cancelada) para o paciente
    // Dose Única com recorrência habilitada é permitida repetir
    {
        const vDupl = vaccines.find(x => String(x.id) === String(vId));
        const isDoseUnicaRepetivel = doseAtualStr === 'Dose Única' &&
            vDupl && vDupl.esquemas && vDupl.esquemas.some(e => e.numDoses === 1 && e.repete);
        const isReforco = doseAtualStr === 'Reforço';
        const dupl = !isDoseUnicaRepetivel && !isReforco && appointments.find(x =>
            String(x.patientId) === String(patId) &&
            String(x.vaccineId) === String(vId) &&
            x.doseAtual === doseAtualStr &&
            x.status !== 'Perdido' &&
            String(x.id) !== String(id)
        );
        if (dupl) {
            const vNomeDupl = vaccines.find(x => String(x.id) === String(vId))?.nome || '';
            const dataDupl = dupl.data ? dupl.data.split('-').reverse().join('/') : '—';
            showNotification(
                `Duplicidade bloqueada: já existe registro de <b>${doseAtualStr}</b> da vacina <b>${vNomeDupl}</b> para este paciente (${dataDupl}).`,
                'error'
            );
            return;
        }
    }

    if(doseAtualStr.includes('ª Dose') && doseAtualStr !== '1ª Dose' && !window._doseAnteriorConfirmado) {
        const numAtual = parseInt(doseAtualStr);
        const prevDoseStr = `${numAtual - 1}ª Dose`;
        const hasPrev = appointments.some(x => x.patientId == patId && x.vaccineId == vId && x.doseAtual === prevDoseStr && x.id != id);
        if(!hasPrev) {
            const vNome = vaccines.find(x => x.id == vId)?.nome || '';
            document.getElementById('dose-anterior-aviso-msg').innerHTML =
                `Não foi encontrado registro da <b>${prevDoseStr}</b> da vacina <b>${vNome}</b> no sistema para este paciente.<br><br>Deseja registrar a <b>${doseAtualStr}</b> mesmo assim?`;
            window._pendingDoseAnteriorEvent = e;
            document.getElementById('modal-dose-anterior-aviso').classList.add('active');
            return;
        }
    }

    // Validação do lote: verificar vencimento na data agendada
    const loteSel = document.getElementById('reg-lote');
    const loteOpt = loteSel.options[loteSel.selectedIndex];
    if (loteOpt && loteOpt.dataset.validade) {
        const expiryDate = new Date(loteOpt.dataset.validade + 'T00:00:00');
        const schedDate = new Date(dateVal + 'T00:00:00');
        if (expiryDate < schedDate) {
            document.getElementById('lote-expired-block-msg').innerHTML =
                `O lote <b>${loteOpt.dataset.numero}</b> vence em <b>${loteOpt.dataset.validade.split('-').reverse().join('/')}</b>, que é anterior à data agendada. Selecione outro lote.`;
            document.getElementById('modal-lote-expired-block').classList.add('active');
            return;
        }
    }

    const statusVal = document.getElementById('reg-status').value;
    const pedidoVal = document.getElementById('reg-pedido').value.trim();

    if ((statusVal === 'Agendado' || statusVal === 'Aplicado') && !pedidoVal) {
        showNotification('Nº Pedido é obrigatório para status Agendado e Aplicado.', 'error');
        return;
    }

    // Bloqueio: salvar como Aplicado exige permissão de aplicador
    if (statusVal === 'Aplicado' && !isCurrentUserAdmin() && !hasPerm('aplicar')) {
        showNotification('Apenas usuários com permissão de aplicador podem registrar aplicações.', 'error');
        return;
    }

    const loteId = loteSel.value ? Number(loteSel.value) : null;
    const loteNumero = loteOpt && loteOpt.dataset.numero ? loteOpt.dataset.numero.toUpperCase() : '';

    // ─── BLOQUEIO DE ESTOQUE ───
    // Reserva (Agendado) ou consumo (Aplicado) exigem disponível > 0 no lote.
    if (loteId && (statusVal === 'Agendado' || statusVal === 'Aplicado') && typeof getLoteDisponivelParaAgendamento === 'function') {
        const dispLivre = getLoteDisponivelParaAgendamento(loteId, id ? Number(id) : null);
        if (dispLivre <= 0) {
            const loteRef = vaccineLots.find(l => l.id == loteId);
            showNotification(`Estoque insuficiente: o lote ${loteRef ? loteRef.numero : ''} não possui doses disponíveis. Selecione outro lote ou registre uma entrada.`, 'error');
            return;
        }
    }

    const vendedorVal = document.getElementById('reg-vendedor').value.trim().toUpperCase();
    const aplicadorVal = document.getElementById('reg-aplicador').value.trim().toUpperCase();

    const vendedores = appUsers.filter(u => u.isVendedor);
    const vendedorValido = vendedores.some(u => u.nome.toUpperCase() === vendedorVal);
    if (!vendedorValido) {
        showNotification('Vendedor inválido. Selecione um nome da lista de usuários cadastrados como vendedor.', 'error');
        return;
    }

    if (aplicadorVal) {
        const aplicadores = appUsers.filter(u => u.isAplicador);
        const aplicadorValido = aplicadores.some(u => u.nome.toUpperCase() === aplicadorVal);
        if (!aplicadorValido) {
            showNotification('Aplicador inválido. Selecione um nome da lista de usuários cadastrados como aplicador.', 'error');
            return;
        }
    }

    const a = {
        id: id ? Number(id) : Date.now(),
        patientId: Number(patId),
        vaccineId: Number(vId),
        data: dateVal,
        hora: document.getElementById('reg-hora').value,
        doseAtual: doseAtualStr,
        valorAplicado: document.getElementById('reg-valor').value,
        valorCheio: _descontoAtivo ? _valorCheio : null,
        descontoPct: _descontoAtivo ? parseFloat((((parseBRL(_valorCheio) - parseBRL(document.getElementById('reg-valor').value)) / parseBRL(_valorCheio)) * 100).toFixed(1)) : null,
        status: statusVal,
        loteId: loteId,
        lote: loteNumero,
        motivoCancelamento: statusVal === 'Perdido' ? document.getElementById('reg-motivo-cancelamento').value : '',
        aplicadaOutroLocal: document.getElementById('reg-aplicada-outro-local')?.checked || false,
        pedido: pedidoVal,
        vendedor: vendedorVal,
        aplicador: aplicadorVal
    };

    const isNew = !id;
    const oldApp = isNew ? null : appointments.find(x => x.id == a.id);
    if(id) appointments = appointments.map(x=>x.id==a.id?a:x); else appointments.push(a);
    const pat = patients.find(x => x.id == a.patientId);
    const vac = vaccines.find(x => x.id == a.vaccineId);
    const fmtDate = d => (d && d.includes('-')) ? d.split('-').reverse().join('/') : (d || '—');
    const oldAppFmt = oldApp ? {...oldApp, data: fmtDate(oldApp.data)} : null;
    const newAppFmt = {...a, data: fmtDate(a.data)};
    const appChanges = isNew ? null : computeChanges(oldAppFmt, newAppFmt, {data:'Data', hora:'Hora', doseAtual:'Dose', status:'Status', lote:'Lote', valorAplicado:'Valor', vendedor:'Vendedor', aplicador:'Aplicador', motivoCancelamento:'Motivo de Perda'});
    logAudit(isNew ? 'Criado' : 'Editado', 'agendamento', a.id,
        `${pat ? pat.nome : '—'} | ${vac ? vac.nome : '—'} | ${a.doseAtual} | ${a.data ? a.data.split('-').reverse().join('/') : '—'}`,
        isNew ? `Status: ${a.status}${a.vendedor ? ' | Vendedor: ' + a.vendedor : ''}` : null, appChanges);
    window._doseAnteriorConfirmado = false;
    if (typeof syncAppointmentMovement === 'function') syncAppointmentMovement(a);
    if (typeof syncAllLoteStatus === 'function') syncAllLoteStatus();
    saveAll(); renderCalendar(); renderTable(); renderDashboard(); renderPatients(); closeModals();
    if (typeof refreshAlmoxIfActive === 'function') refreshAlmoxIfActive();
    if (typeof refreshOpenModals === 'function') refreshOpenModals();
    if (typeof updateExpiryBadge === 'function') updateExpiryBadge();
    const _oppElSave = document.getElementById('agendaview-oportunidades');
    if (_oppElSave && !_oppElSave.classList.contains('hidden') && typeof renderOportunidades === 'function') renderOportunidades();
    showNotification('Agendamento salvo com sucesso!', 'success');
}
