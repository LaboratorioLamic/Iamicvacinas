// ─── VACCINE MANAGEMENT (from index.html lines ~4492-4970) ───────────────────

function renderVaccines() {
    const search = normalizeStr(document.getElementById('filter-vaccine')?.value || '');
    const tbody = document.getElementById('vaccines-body'); tbody.innerHTML = '';
    const sorted = [...vaccines]
        .filter(v => !search || normalizeStr(v.nome).includes(search))
        .sort((a, b) => {
            const aAtivo = a.ativo !== false, bAtivo = b.ativo !== false;
            if(aAtivo !== bAtivo) return aAtivo ? -1 : 1;
            return a.nome.localeCompare(b.nome, 'pt-BR');
        });
    sorted.forEach(v => {
        // Esquema a partir dos esquemas por faixa etária
        let schema = '';
        if (v.esquemas && v.esquemas.length) {
            schema = v.esquemas.map(esq => {
                const faixa = esq.minAnos != null ? formatFaixaEtaria(esq) : 'Qualquer idade';
                return `${faixa}: ${esq.numDoses || 1}D`;
            }).join('<br>');
            if (v.reforco) schema += ' + Reforço';
            if (v.doseUnica) schema += ' (+ D. Única)';
        } else {
            schema = v.doseUnica ? `${v.numDoses} Dose(s) (+ Dose Única)` : `${v.numDoses} Dose(s)${v.reforco?' + Reforço':''}`;
        }

        let idadeMinStr = '';
        if (v.esquemas && v.esquemas.length > 0) {
            const faixas = v.esquemas.filter(esq => esq.minAnos != null).map(esq => formatFaixaEtaria(esq));
            idadeMinStr = faixas.length ? faixas.join('<br>') : 'Sem restrição';
        } else if(v.idadeMinimaAnos > 0 || v.idadeMinimaMeses > 0) {
            if(v.idadeMinimaAnos > 0 && v.idadeMinimaMeses > 0) {
                idadeMinStr = `${v.idadeMinimaAnos} ano(s) ${v.idadeMinimaMeses} mês(es)`;
            } else if(v.idadeMinimaAnos > 0) {
                idadeMinStr = `${v.idadeMinimaAnos} ano(s)`;
            } else {
                idadeMinStr = `${v.idadeMinimaMeses} mês(es)`;
            }
        } else {
            idadeMinStr = 'Sem restrição';
        }

        const ativo = v.ativo !== false;
        const hasAppointments = appointments.some(a => a.vaccineId == v.id);
        tbody.innerHTML += `<tr class="hover:bg-slate-50 transition ${!ativo ? 'opacity-50' : ''}">
            <td class="p-3 font-bold text-slate-700">${v.nome}</td><td class="p-3 text-xs">${schema}</td>
            <td class="p-3 text-xs">${(v.intervalos && v.intervalos.length ? v.intervalos.map((x,i)=>`D${i+1}→D${i+2}: ${x}d`).join(', ') : (v.intervaloDias > 0 ? v.intervaloDias + ' dias' : '-'))}</td>
            <td class="p-3 text-xs">${idadeMinStr}</td>
            <td class="p-3 text-xs font-bold text-green-600">${formatCurrency(v.valor)}</td>
            <td class="p-3 text-center">
                <span class="px-2 py-1 rounded-full text-[10px] font-black uppercase ${ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">${ativo ? 'Ativa' : 'Inativa'}</span>
            </td>
            <td class="p-3 text-center">
                <div class="flex justify-center gap-2">
                    ${permBtn('vacinas_crud', `<button onclick="editVaccine(${v.id})" class="h-8 w-8 bg-slate-100 hover:bg-clinic-600 hover:text-white rounded transition shadow-sm" title="Editar"><i class="fas fa-pen text-[10px]"></i></button>`)}
                    ${permBtn('lotes_fechar_abrir', `<button onclick="openLoteModal(${v.id})" class="h-8 w-8 bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white rounded transition shadow-sm" title="Gerenciar Lotes"><i class="fas fa-list-check text-[10px]"></i></button>`)}
                    ${permBtn('vacinas_ativar', `<button onclick="toggleVaccineStatus(${v.id})" class="h-8 w-8 ${ativo ? 'bg-green-50 text-green-600 hover:bg-green-500' : 'bg-orange-50 text-orange-500 hover:bg-orange-500'} hover:text-white rounded transition shadow-sm" title="${ativo ? 'Desativar' : 'Ativar'}"><i class="fas ${ativo ? 'fa-toggle-on' : 'fa-toggle-off'} text-[10px]"></i></button>`)}
                    ${!hasAppointments ? permBtn('excluir_vacina', `<button onclick="deleteVaccine(${v.id})" class="h-8 w-8 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded transition shadow-sm" title="Excluir"><i class="fas fa-trash text-[10px]"></i></button>`) : ''}
                </div>
            </td>
        </tr>`;
    });
    populateVaccineSelects();
}

// ─── ESQUEMAS VACINAIS POR FAIXA ETÁRIA ───────────────────────────────────────
function formatFaixaEtaria(esq) {
    const minStr = esq.minAnos > 0 && esq.minMeses > 0 ? `${esq.minAnos}a ${esq.minMeses}m`
        : esq.minAnos > 0 ? `${esq.minAnos} ano(s)`
        : esq.minMeses > 0 ? `${esq.minMeses} mês(es)`
        : '0 meses';
    const hasMax = esq.maxAnos != null && esq.maxAnos !== '' || esq.maxMeses != null && esq.maxMeses !== '';
    if (!hasMax) return `A partir de ${minStr}`;
    const maxStr = (esq.maxAnos > 0 && esq.maxMeses > 0) ? `${esq.maxAnos}a ${esq.maxMeses}m`
        : esq.maxAnos > 0 ? `${esq.maxAnos} ano(s)`
        : `${esq.maxMeses} mês(es)`;
    return `${minStr} até ${maxStr}`;
}

function renderEsquemas() {
    const container = document.getElementById('container-esquemas');
    const hint = document.getElementById('esquemas-empty-hint');
    if (!_esquemas.length) { container.innerHTML = ''; hint.classList.remove('hidden'); return; }
    hint.classList.add('hidden');
    container.innerHTML = _esquemas.map((esq, idx) => {
        const faixaStr = esq.minAnos != null ? formatFaixaEtaria(esq) : 'Faixa não definida';
        const hasFaixa = esq.minAnos != null;
        const numD = esq.numDoses || 1;
        let intervalosHtml = '';
        if (numD > 1) {
            const cols = numD - 1 === 1 ? 'grid-cols-1' : numD - 1 === 2 ? 'grid-cols-2' : 'grid-cols-3';
            intervalosHtml = `<div class="grid ${cols} gap-2 mt-2">`;
            for (let i = 2; i <= numD; i++) {
                const val = esq.intervalos && esq.intervalos[i-2] != null ? esq.intervalos[i-2] : 30;
                intervalosHtml += `<div><label class="block text-[9px] font-bold text-slate-400 mb-0.5">D${i-1}→D${i}</label><input type="number" min="1" value="${val}" onchange="updateEsquemaIntervalo(${idx},${i-1},this.value)" class="w-full border border-slate-200 rounded py-1 px-2 text-xs focus:ring-1 focus:ring-clinic-500 outline-none"></div>`;
            }
            intervalosHtml += '</div>';
        }
        return `<div class="border-2 ${hasFaixa ? 'border-blue-300' : 'border-slate-200'} rounded-xl p-3 bg-white shadow-sm">
            <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-2 flex-wrap">
                    <button type="button" onclick="openFaixaEtariaModal(${idx})" class="flex items-center gap-1.5 border-2 ${hasFaixa ? 'border-green-400 text-green-700 bg-green-50 hover:bg-green-100' : 'border-slate-300 text-slate-500 hover:bg-slate-50'} text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition">
                        <i class="fas fa-child text-[9px]"></i>
                        <span>${hasFaixa ? faixaStr : 'Faixa etária'}</span>
                    </button>
                    <div class="flex items-center gap-1">
                        <label class="text-[10px] font-bold text-slate-400 uppercase">Doses:</label>
                        <select onchange="updateEsquemaDoses(${idx},this.value)" class="border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-clinic-500 outline-none">
                            <option value="1" ${numD==1?'selected':''}>1</option>
                            <option value="2" ${numD==2?'selected':''}>2</option>
                            <option value="3" ${numD==3?'selected':''}>3</option>
                            <option value="4" ${numD==4?'selected':''}>4</option>
                        </select>
                    </div>
                </div>
                <button type="button" onclick="removeEsquema(${idx})" class="h-7 w-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition flex-shrink-0" title="Remover esquema"><i class="fas fa-trash text-[10px]"></i></button>
            </div>
            ${intervalosHtml}
        </div>`;
    }).join('');
}

function addEsquemaVacinal() {
    _esquemas.push({ minAnos: null, minMeses: null, maxAnos: null, maxMeses: null, numDoses: 1, intervalos: [] });
    renderEsquemas();
}

function removeEsquema(idx) {
    _esquemas.splice(idx, 1);
    renderEsquemas();
}

function updateEsquemaDoses(idx, val) {
    _esquemas[idx].numDoses = Number(val);
    if (!_esquemas[idx].intervalos) _esquemas[idx].intervalos = [];
    renderEsquemas();
}

function updateEsquemaIntervalo(idx, posIdx, val) {
    if (!_esquemas[idx].intervalos) _esquemas[idx].intervalos = [];
    _esquemas[idx].intervalos[posIdx - 1] = Number(val);
}

function openFaixaEtariaModal(idx) {
    const esq = _esquemas[idx];
    document.getElementById('faixa-etaria-target-idx').value = idx;
    document.getElementById('faixa-min-anos').value = esq.minAnos != null ? esq.minAnos : 0;
    document.getElementById('faixa-min-meses').value = esq.minMeses != null ? esq.minMeses : 0;
    document.getElementById('faixa-max-anos').value = esq.maxAnos != null ? esq.maxAnos : '';
    document.getElementById('faixa-max-meses').value = esq.maxMeses != null ? esq.maxMeses : '';
    document.getElementById('modal-faixa-etaria').classList.add('active');
}

function confirmarFaixaEtaria() {
    const idx = Number(document.getElementById('faixa-etaria-target-idx').value);
    const minAnos = Number(document.getElementById('faixa-min-anos').value) || 0;
    const minMeses = Number(document.getElementById('faixa-min-meses').value) || 0;
    const maxAnosRaw = document.getElementById('faixa-max-anos').value;
    const maxMesesRaw = document.getElementById('faixa-max-meses').value;
    _esquemas[idx].minAnos = minAnos;
    _esquemas[idx].minMeses = minMeses;
    _esquemas[idx].maxAnos = maxAnosRaw !== '' ? Number(maxAnosRaw) : null;
    _esquemas[idx].maxMeses = maxMesesRaw !== '' ? Number(maxMesesRaw) : null;
    document.getElementById('modal-faixa-etaria').classList.remove('active');
    renderEsquemas();
}

function openVaccineModal() {
    if (!checkPerm('vacinas_crud')) return;
    document.getElementById('vacina-form').reset();
    document.getElementById('vac-id').value = '';
    _esquemas = [];
    renderEsquemas();
    document.getElementById('modal-vacina').classList.add('active');
}

function editVaccine(id) {
    if (!checkPerm('vacinas_crud')) return;
    const v = vaccines.find(x=>x.id==id); if(!v) return;
    document.getElementById('vac-id').value = v.id;
    document.getElementById('vac-nome').value = v.nome;
    document.getElementById('vac-reforco').checked = v.reforco;
    document.getElementById('vac-unica').checked = v.doseUnica;
    document.getElementById('vac-valor').value = String(v.valor || '').replace('R$', '').trim();
    // Migração: vacinas antigas sem esquemas recebem um esquema padrão derivado dos campos legados
    if (v.esquemas && v.esquemas.length) {
        _esquemas = JSON.parse(JSON.stringify(v.esquemas));
    } else {
        const intervalos = v.intervalos && v.intervalos.length ? v.intervalos : (v.intervaloDias > 0 ? [v.intervaloDias] : []);
        _esquemas = [{ minAnos: v.idadeMinimaAnos || 0, minMeses: v.idadeMinimaMeses || 0, maxAnos: null, maxMeses: null, numDoses: v.numDoses || 1, intervalos }];
    }
    renderEsquemas();
    document.getElementById('modal-vacina').classList.add('active');
}

function saveVaccine(e) {
    e.preventDefault();
    if (!_esquemas.length) { showNotification('Adicione ao menos um esquema vacinal antes de salvar.', 'error'); return; }
    const id = document.getElementById('vac-id').value;
    const existing = vaccines.find(x => x.id == id);
    // numDoses e intervalos derivados do maior esquema (retrocompatibilidade com agendamentos)
    const maiorEsquema = _esquemas.reduce((a, b) => (b.numDoses || 1) > (a.numDoses || 1) ? b : a, _esquemas[0]);
    const n = maiorEsquema.numDoses || 1;
    const intervalosBase = maiorEsquema.intervalos && maiorEsquema.intervalos.length ? maiorEsquema.intervalos : [];
    // Retrocompatibilidade de idadeMinima
    const primeiroEsquema = _esquemas.find(esq => esq.minAnos != null);
    const idadeMinimaAnos = primeiroEsquema ? (primeiroEsquema.minAnos || 0) : 0;
    const idadeMinimaMeses = primeiroEsquema ? (primeiroEsquema.minMeses || 0) : 0;
    const v = {
        id: id ? Number(id) : Date.now(), nome: document.getElementById('vac-nome').value.toUpperCase(),
        numDoses: n, intervalos: intervalosBase, intervaloDias: intervalosBase[0] || 0,
        reforco: document.getElementById('vac-reforco').checked, doseUnica: document.getElementById('vac-unica').checked,
        idadeMinimaAnos, idadeMinimaMeses,
        esquemas: JSON.parse(JSON.stringify(_esquemas)),
        valor: document.getElementById('vac-valor').value,
        ativo: existing ? (existing.ativo !== false) : true
    };
    const isNewVac = !id;
    const oldVac = isNewVac ? null : vaccines.find(x => x.id == v.id);
    const oldVacFlat = oldVac ? {...oldVac, intervalosStr: (oldVac.intervalos||[]).join('/') || '—', reforcoStr: oldVac.reforco ? 'Sim' : 'Não', doseUnicaStr: oldVac.doseUnica ? 'Sim' : 'Não'} : null;
    const newVacFlat = {...v, intervalosStr: (v.intervalos||[]).join('/') || '—', reforcoStr: v.reforco ? 'Sim' : 'Não', doseUnicaStr: v.doseUnica ? 'Sim' : 'Não'};
    if(id) vaccines = vaccines.map(x=>x.id==v.id?v:x); else vaccines.push(v);
    const vacChanges = isNewVac ? null : computeChanges(oldVacFlat, newVacFlat, {nome:'Nome', numDoses:'Doses', intervalosStr:'Intervalos', reforcoStr:'Dose Reforço', doseUnicaStr:'Dose Única', idadeMinimaAnos:'Idade Mín. (Anos)', idadeMinimaMeses:'Idade Mín. (Meses)', valor:'Valor'});
    logAudit(isNewVac ? 'Criado' : 'Editado', 'vacina', v.id, v.nome, isNewVac ? `${v.numDoses} dose(s) | Valor: ${v.valor}` : null, vacChanges);
    saveAll(); renderVaccines(); updateExpiryBadge(); closeModals(); showNotification('Vacina salva!','success');
}

function toggleVaccineStatus(id) {
    if (!checkPerm('vacinas_ativar')) return;
    const idx = vaccines.findIndex(x => x.id == id);
    if(idx < 0) return;
    const wasAtivo = vaccines[idx].ativo !== false;
    vaccines[idx].ativo = !wasAtivo;
    saveAll(); renderVaccines();
    showNotification(`Vacina ${wasAtivo ? 'desativada' : 'ativada'} com sucesso!`, wasAtivo ? 'info' : 'success');
}

function deleteVaccine(id) {
    if (!checkPerm('excluir_vacina')) return;
    const v = vaccines.find(x => x.id == id);
    if(!v) return;
    const inUse = appointments.some(a => a.vaccineId == id);
    if(inUse) { showNotification('Não é possível excluir: vacina possui agendamentos vinculados. Desative-a em vez de excluir.', 'error'); return; }
    if(!confirm(`Excluir a vacina "${v.nome}" permanentemente?`)) return;
    logAudit('Excluído', 'vacina', id, v.nome);
    vaccines = vaccines.filter(x => x.id != id);
    vaccineLots = vaccineLots.filter(l => l.vaccineId != id);
    saveAll(); renderVaccines(); updateExpiryBadge();
    showNotification('Vacina excluída!', 'success');
}

// ─── GESTÃO DE LOTES ──────────────────────────────────────────────────────────
function openLoteModal(vaccineId) {
    currentLoteModalVaccineId = vaccineId;
    const v = vaccines.find(x => x.id == vaccineId);
    document.getElementById('lote-modal-vaccine-name').innerText = v ? v.nome : '';
    document.getElementById('novo-lote-numero').value = '';
    document.getElementById('novo-lote-validade').value = '';
    switchLoteTab('abertos');
    document.getElementById('modal-lotes').classList.add('active');
}

function switchLoteTab(tab) {
    document.getElementById('lote-abertos-list').classList.toggle('hidden', tab !== 'abertos');
    document.getElementById('lote-fechados-list').classList.toggle('hidden', tab !== 'fechados');
    const btnAbertos = document.getElementById('tab-lote-abertos');
    const btnFechados = document.getElementById('tab-lote-fechados');
    if (tab === 'abertos') {
        btnAbertos.className = 'flex-1 py-3 text-xs font-black uppercase tracking-widest text-green-700 bg-white border-b-2 border-green-500 transition';
        btnFechados.className = 'flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 border-b-2 border-transparent transition';
    } else {
        btnFechados.className = 'flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-600 bg-white border-b-2 border-slate-500 transition';
        btnAbertos.className = 'flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 border-b-2 border-transparent transition';
    }
    renderLoteLists();
}

function renderLoteLists() {
    const abertos = vaccineLots.filter(l => l.vaccineId == currentLoteModalVaccineId && l.status === 'aberto').sort((a, b) => new Date(a.validade) - new Date(b.validade));
    const fechados = vaccineLots.filter(l => l.vaccineId == currentLoteModalVaccineId && l.status === 'fechado');
    const today = new Date(); today.setHours(0,0,0,0);
    const twoMonths = new Date(); twoMonths.setMonth(twoMonths.getMonth() + 2);

    function lotCard(l, isAberto) {
        const exp = new Date(l.validade + 'T00:00:00');
        const expired = exp < today;
        const nearExpiry = !expired && exp <= twoMonths;
        const emUso = appointments.some(a => a.loteId == l.id || a.loteNumero === l.numero);
        let badgeHtml = '';
        if (expired) badgeHtml = `<span class="px-2 py-0.5 rounded text-[9px] font-black bg-red-100 text-red-600">VENCIDO</span>`;
        else if (nearExpiry) badgeHtml = `<span class="px-2 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-600">VENCENDO</span>`;
        return `
        <div class="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition">
            <div>
                <p class="font-black text-navy-900 text-sm">Lote: ${l.numero}</p>
                <p class="text-[10px] text-slate-500 font-bold">Validade: ${l.validade.split('-').reverse().join('/')} ${badgeHtml}</p>
                ${emUso ? '<p class="text-[9px] text-slate-400 font-bold mt-0.5"><i class="fas fa-link mr-1"></i>Em uso em agendamentos</p>' : ''}
            </div>
            <div class="flex gap-2">
                ${isAberto
                    ? permBtn('lotes_fechar_abrir', `<button onclick="toggleLoteStatus(${l.id},'fechado')" class="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black hover:bg-slate-200 transition" title="Fechar lote"><i class="fas fa-lock mr-1"></i>Fechar</button>`)
                    : permBtn('lotes_fechar_abrir', `<button onclick="toggleLoteStatus(${l.id},'aberto')" class="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-[10px] font-black hover:bg-green-100 transition" title="Abrir lote"><i class="fas fa-lock-open mr-1"></i>Abrir</button>`)
                }
                ${!emUso ? permBtn('lotes_fechar_abrir', `<button onclick="editLote(${l.id})" class="h-7 w-7 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg text-[10px] flex items-center justify-center transition" title="Editar lote"><i class="fas fa-pen"></i></button>`) : ''}
                ${!emUso ? permBtn('excluir_lote', `<button onclick="deleteLote(${l.id})" class="h-7 w-7 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[10px] flex items-center justify-center transition"><i class="fas fa-trash"></i></button>`) : ''}
            </div>
        </div>`;
    }

    const aEl = document.getElementById('lote-abertos-list');
    const fEl = document.getElementById('lote-fechados-list');
    aEl.innerHTML = abertos.length ? abertos.map(l => lotCard(l, true)).join('') : '<p class="text-center text-slate-400 text-sm py-6 font-bold">Nenhum lote aberto.</p>';
    fEl.innerHTML = fechados.length ? fechados.map(l => lotCard(l, false)).join('') : '<p class="text-center text-slate-400 text-sm py-6 font-bold">Nenhum lote fechado.</p>';
}

function addLote() {
    if (!checkPerm('lotes_fechar_abrir')) return;
    const numero = document.getElementById('novo-lote-numero').value.trim().toUpperCase();
    const validade = document.getElementById('novo-lote-validade').value;
    if (!numero || !validade) { showNotification('Informe o número do lote e a validade.', 'error'); return; }
    if (!currentLoteModalVaccineId) return;
    const novoLote = { id: Date.now(), vaccineId: currentLoteModalVaccineId, numero, validade, status: 'aberto' };
    vaccineLots.push(novoLote);
    const vacLote = vaccines.find(v => v.id == currentLoteModalVaccineId);
    logAudit('Criado', 'lote', String(currentLoteModalVaccineId), `Lote ${numero}`, `Vacina: ${vacLote ? vacLote.nome : '—'} | Validade: ${validade}`);
    document.getElementById('novo-lote-numero').value = '';
    document.getElementById('novo-lote-validade').value = '';
    saveAll(); renderLoteLists(); updateExpiryBadge(); showNotification('Lote cadastrado com sucesso!', 'success');
}

function toggleLoteStatus(loteId, newStatus) {
    if (!checkPerm('lotes_fechar_abrir')) return;
    if (newStatus === 'fechado') {
        const lote = vaccineLots.find(l => l.id == loteId);
        const vac  = lote ? vaccines.find(v => v.id == lote.vaccineId) : null;
        document.getElementById('fechar-lote-numero').textContent   = lote ? lote.numero : '—';
        document.getElementById('fechar-lote-vacina').textContent   = vac  ? vac.nome   : '—';
        document.getElementById('fechar-lote-validade').textContent = lote ? lote.validade.split('-').reverse().join('/') : '—';
        document.getElementById('btn-confirmar-fechar-lote').onclick = () => {
            document.getElementById('modal-fechar-lote-aviso').classList.remove('active');
            const idx = vaccineLots.findIndex(l => l.id == loteId);
            if (idx > -1) { vaccineLots[idx].status = 'fechado'; saveAll(); renderLoteLists(); updateExpiryBadge(); showNotification('Lote fechado com sucesso!', 'success'); }
        };
        document.getElementById('modal-fechar-lote-aviso').classList.add('active');
        return;
    }
    const idx = vaccineLots.findIndex(l => l.id == loteId);
    if (idx > -1) { vaccineLots[idx].status = 'aberto'; saveAll(); renderLoteLists(); updateExpiryBadge(); showNotification('Lote aberto com sucesso!', 'success'); }
}

function deleteLote(loteId) {
    if (!checkPerm('excluir_lote')) return;
    if (!confirm('Excluir este lote definitivamente?')) return;
    const lote = vaccineLots.find(l => l.id == loteId);
    const vacLote = lote ? vaccines.find(v => v.id == lote.vaccineId) : null;
    logAudit('Excluído', 'lote', String(lote ? lote.vaccineId : loteId), lote ? `Lote ${lote.numero}` : '—', vacLote ? `Vacina: ${vacLote.nome}` : null);
    vaccineLots = vaccineLots.filter(l => l.id != loteId);
    saveAll(); renderLoteLists(); updateExpiryBadge(); showNotification('Lote excluído.', 'success');
}

function editLote(loteId) {
    if (!checkPerm('lotes_fechar_abrir')) return;
    const l = vaccineLots.find(x => x.id == loteId);
    if (!l) return;
    document.getElementById('edit-lote-id').value = l.id;
    document.getElementById('edit-lote-numero').value = l.numero;
    document.getElementById('edit-lote-validade').value = l.validade;
    document.getElementById('modal-edit-lote').classList.add('active');
}

function salvarEdicaoLote() {
    const id = document.getElementById('edit-lote-id').value;
    const numero = document.getElementById('edit-lote-numero').value.trim().toUpperCase();
    const validade = document.getElementById('edit-lote-validade').value;
    if (!numero || !validade) { showNotification('Preencha o número e a validade.', 'error'); return; }
    const idx = vaccineLots.findIndex(l => l.id == id);
    if (idx === -1) return;
    const old = {...vaccineLots[idx]};
    vaccineLots[idx].numero = numero;
    vaccineLots[idx].validade = validade;
    logAudit('Editado', 'lote', String(vaccineLots[idx].vaccineId), `Lote ${numero}`, `Número: ${old.numero}→${numero} | Validade: ${old.validade}→${validade}`);
    saveAll(); renderLoteLists(); updateExpiryBadge();
    document.getElementById('modal-edit-lote').classList.remove('active');
    showNotification('Lote atualizado com sucesso!', 'success');
}

// ─── ALERTAS DE VENCIMENTO ───────────────────────────────────────────────────
function getExpiryAlerts() {
    const today = new Date(); today.setHours(0,0,0,0);
    const twoMonths = new Date(); twoMonths.setMonth(twoMonths.getMonth() + 2); twoMonths.setHours(0,0,0,0);
    const alerts = [];
    vaccineLots.filter(l => l.status === 'aberto').forEach(l => {
        const exp = new Date(l.validade + 'T00:00:00');
        const vaccine = vaccines.find(v => v.id == l.vaccineId);
        if (!vaccine) return;
        const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        if (exp < today || exp <= twoMonths) {
            alerts.push({ lot: l, vaccine, expired: exp < today, daysLeft });
        }
    });
    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
}

function renderExpiryPanel() {
    const alerts = getExpiryAlerts();
    updateExpiryBadge();
    const list = document.getElementById('expiry-panel-list');
    if (alerts.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-400 text-sm py-6 font-bold"><i class="fas fa-check-circle text-green-400 mr-2"></i>Nenhum lote próximo do vencimento!</p>';
        return;
    }
    list.innerHTML = alerts.map(({ lot, vaccine, expired, daysLeft }) => {
        const badge = expired
            ? `<span class="shrink-0 px-2 py-0.5 rounded text-[9px] font-black bg-red-100 text-red-600 whitespace-nowrap">VENCIDO há ${Math.abs(daysLeft)} dia(s)</span>`
            : `<span class="shrink-0 px-2 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-700 whitespace-nowrap">Vence em ${daysLeft} dia(s)</span>`;
        const borderCls = expired ? 'border-red-200 hover:border-red-400 bg-red-50 hover:bg-red-100' : 'border-amber-200 hover:border-amber-400 bg-amber-50 hover:bg-amber-100';
        return `<button onclick="const _p=document.getElementById('expiry-panel');_p.classList.add('hidden');_p.classList.remove('flex'); openLoteModal(${vaccine.id});" class="w-full text-left p-3 rounded-xl border ${borderCls} transition group">
            <div class="flex justify-between items-center gap-2">
                <div class="min-w-0 flex-1">
                    <p class="font-black text-navy-900 text-xs truncate group-hover:text-clinic-700">${vaccine.nome}</p>
                    <p class="text-[10px] text-slate-500 font-bold mt-0.5"><i class="fas fa-list-check mr-1 text-slate-400"></i>Lote ${lot.numero} &nbsp;·&nbsp; Val: ${lot.validade.split('-').reverse().join('/')}</p>
                </div>
                <div class="flex items-center gap-1.5">${badge}<i class="fas fa-chevron-right text-[9px] text-slate-300 group-hover:text-clinic-500 transition"></i></div>
            </div>
        </button>`;
    }).join('');
}
