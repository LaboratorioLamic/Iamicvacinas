// ═══════════════════════════════════════════════════════════════════════════
//  ALMOXARIFADO — Controle de Estoque, Lotes, Reservas e Movimentação
// ═══════════════════════════════════════════════════════════════════════════
//
//  MODELO DE ESTOQUE (por lote)
//  ─────────────────────────────────────────────────────────────────────────
//  • lote.quantidade        → total recebido (entradas acumuladas no cadastro)
//  • Saídas automáticas      → agendamentos com status "Aplicado"  (consumo real)
//  • Reservas                → agendamentos com status "Agendado"   (reservado)
//  • Saídas manuais          → stockMovements tipo 'saida' (descarte / ajuste)
//  • Entradas manuais        → stockMovements tipo 'entrada' (reabastecimento)
//
//  disponível = quantidadeTotal − aplicado − reservado − saídasManuais
//  Quando disponível ≤ 0  →  lote é desativado (status 'fechado') automaticamente.
//  Recebendo nova entrada  →  lote é reativado (status 'aberto').
// ═══════════════════════════════════════════════════════════════════════════

// ─── CÁLCULO DE ESTOQUE ───────────────────────────────────────────────────────

// Total recebido = quantidade base do lote + entradas manuais registradas
function getLoteEntradas(loteId) {
    const base = Number(vaccineLots.find(l => l.id == loteId)?.quantidade) || 0;
    const manuais = stockMovements
        .filter(m => m.loteId == loteId && m.tipo === 'entrada')
        .reduce((s, m) => s + (Number(m.qtd) || 0), 0);
    return base + manuais;
}

// Doses aplicadas (saída real de estoque) vinculadas ao lote
function getLoteAplicado(loteId) {
    return appointments.filter(a => a.loteId == loteId && a.status === 'Aplicado').length;
}

// Doses reservadas (agendadas, ainda não aplicadas) vinculadas ao lote
function getLoteReservado(loteId) {
    return appointments.filter(a => a.loteId == loteId && a.status === 'Agendado').length;
}

// Saídas manuais (descarte / ajuste) registradas na movimentação
function getLoteSaidasManuais(loteId) {
    return stockMovements
        .filter(m => m.loteId == loteId && m.tipo === 'saida')
        .reduce((s, m) => s + (Number(m.qtd) || 0), 0);
}

// Retorna o panorama completo de estoque de um lote
function getLoteEstoque(loteId) {
    const total      = getLoteEntradas(loteId);
    const aplicado   = getLoteAplicado(loteId);
    const reservado  = getLoteReservado(loteId);
    const saidaManual = getLoteSaidasManuais(loteId);
    const disponivel = total - aplicado - reservado - saidaManual;
    return { total, aplicado, reservado, saidaManual, disponivel: Math.max(0, disponivel), _disponivelRaw: disponivel };
}

// Estoque consolidado de uma vacina (somando todos os lotes)
function getVaccineEstoque(vaccineId) {
    const lotes = vaccineLots.filter(l => l.vaccineId == vaccineId);
    return lotes.reduce((acc, l) => {
        const e = getLoteEstoque(l.id);
        acc.total += e.total; acc.aplicado += e.aplicado;
        acc.reservado += e.reservado; acc.saidaManual += e.saidaManual;
        acc.disponivel += e.disponivel;
        acc.lotesAtivos += (l.status === 'aberto' && e.disponivel > 0) ? 1 : 0;
        acc.lotesTotal += 1;
        return acc;
    }, { total:0, aplicado:0, reservado:0, saidaManual:0, disponivel:0, lotesAtivos:0, lotesTotal:0 });
}

// Disponível considerando que um agendamento já reserva 1 dose deste lote
// (usado para validar edição sem contar a própria reserva em dobro)
function getLoteDisponivelParaAgendamento(loteId, ignoreAppointmentId) {
    const total      = getLoteEntradas(loteId);
    const aplicado   = appointments.filter(a => a.loteId == loteId && a.status === 'Aplicado' && a.id != ignoreAppointmentId).length;
    const reservado  = appointments.filter(a => a.loteId == loteId && a.status === 'Agendado' && a.id != ignoreAppointmentId).length;
    const saidaManual = getLoteSaidasManuais(loteId);
    return total - aplicado - reservado - saidaManual;
}

// ─── DESATIVAÇÃO / REATIVAÇÃO AUTOMÁTICA DE LOTES ──────────────────────────────
// Lote com disponível ≤ 0 e que já teve entrada → fechado.
// Lote com disponível > 0 → aberto.  Retorna true se algo mudou.
function syncLoteStatus(loteId) {
    const lote = vaccineLots.find(l => l.id == loteId);
    if (!lote) return false;
    const e = getLoteEstoque(loteId);
    let changed = false;
    if (e.total > 0 && e.disponivel <= 0 && lote.status !== 'fechado') {
        lote.status = 'fechado';
        lote._autoFechado = true; // marca que foi automático (zerou estoque)
        changed = true;
    } else if (e.disponivel > 0 && lote.status === 'fechado' && lote._autoFechado) {
        lote.status = 'aberto';
        lote._autoFechado = false;
        changed = true;
    }
    return changed;
}

// Re-sincroniza todos os lotes (chamar após qualquer alteração de estoque)
function syncAllLoteStatus() {
    let changed = false;
    vaccineLots.forEach(l => { if (syncLoteStatus(l.id)) changed = true; });
    return changed;
}

// ─── NAVEGAÇÃO ENTRE MÓDULOS ───────────────────────────────────────────────────
function switchAlmoxModulo(modulo) {
    almoxModulo = modulo;
    // oculta todos os módulos
    document.querySelectorAll('.alm-modulo').forEach(el => el.classList.add('hidden'));
    // reseta estilo de todos os botões da barra lateral
    document.querySelectorAll('.alm-mod-btn').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.color = 'rgba(148,163,184,1)';
        btn.style.boxShadow = '';
        const icon = btn.querySelector('.alm-btn-icon');
        if (icon) icon.style.background = 'rgba(255,255,255,0.08)';
    });
    // exibe módulo ativo
    document.getElementById('alm-modulo-' + modulo)?.classList.remove('hidden');
    // destaca botão ativo
    const activeBtn = document.getElementById('alm-btn-' + modulo);
    if (activeBtn) {
        activeBtn.style.background = 'rgba(37,99,235,0.9)';
        activeBtn.style.color = 'white';
        activeBtn.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
        const icon = activeBtn.querySelector('.alm-btn-icon');
        if (icon) icon.style.background = 'rgba(255,255,255,0.2)';
    }
    if (modulo === 'estoque')           renderEstoqueDashboard();
    else if (modulo === 'produtos')     renderVaccines();
    else if (modulo === 'lotes')        renderAlmoxLotes();
    else if (modulo === 'movimentacao') renderMovimentacao();
}

// Re-renderiza o módulo ativo quando os dados mudam via sync
function refreshAlmoxIfActive() {
    if (!document.getElementById('tab-vacinas')?.classList.contains('active')) return;
    if (almoxModulo === 'estoque')           renderEstoqueDashboard();
    else if (almoxModulo === 'produtos')     renderVaccines();
    else if (almoxModulo === 'lotes')        renderAlmoxLotes();
    else if (almoxModulo === 'movimentacao') renderMovimentacao();
}

// ═══════════════════════════════════════════════════════════════════════════
//  MÓDULO: ESTOQUE (Dashboard)
// ═══════════════════════════════════════════════════════════════════════════
let estoqueSearch = '';

function setEstoqueSearch(val) { estoqueSearch = normalizeStr(val); renderEstoqueDashboard(); }

function renderEstoqueDashboard() {
    const ativos = vaccines.filter(v => v.ativo !== false);
    // KPIs gerais
    let kTotal = 0, kDisp = 0, kReserv = 0, kAplic = 0, lotesVencidos = 0, lotesVencendo = 0;
    const today = new Date(); today.setHours(0,0,0,0);
    const twoMonths = new Date(); twoMonths.setMonth(twoMonths.getMonth() + 2); twoMonths.setHours(0,0,0,0);
    vaccineLots.forEach(l => {
        const e = getLoteEstoque(l.id);
        kTotal += e.total; kDisp += e.disponivel; kReserv += e.reservado; kAplic += e.aplicado;
        if (l.validade) {
            const exp = new Date(l.validade + 'T00:00:00');
            if (exp < today && e.disponivel > 0) lotesVencidos++;
            else if (exp <= twoMonths && e.disponivel > 0) lotesVencendo++;
        }
    });
    setText('estoque-kpi-total', kTotal);
    setText('estoque-kpi-disponivel', kDisp);
    setText('estoque-kpi-reservado', kReserv);
    setText('estoque-kpi-aplicado', kAplic);
    setText('estoque-kpi-vencidos', lotesVencidos);
    setText('estoque-kpi-vencendo', lotesVencendo);

    // Tabela por produto
    const tbody = document.getElementById('estoque-body');
    if (!tbody) return;
    const rows = ativos
        .filter(v => !estoqueSearch || normalizeStr(v.nome).includes(estoqueSearch))
        .map(v => ({ v, e: getVaccineEstoque(v.id) }))
        .sort((a, b) => a.v.nome.localeCompare(b.v.nome, 'pt-BR'));

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">Nenhum produto encontrado</td></tr>`;
        return;
    }
    tbody.innerHTML = rows.map(({ v, e }) => {
        const semEstoque = e.disponivel <= 0;
        const baixo = !semEstoque && e.disponivel <= 5;
        const dispCls = semEstoque ? 'bg-red-100 text-red-700' : baixo ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
        const statusBadge = semEstoque
            ? `<span class="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-red-100 text-red-600">Sem estoque</span>`
            : baixo
                ? `<span class="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-700">Estoque baixo</span>`
                : `<span class="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-green-100 text-green-700">Disponível</span>`;
        return `<tr class="hover:bg-slate-50 transition">
            <td class="p-3 font-bold text-slate-700">${v.nome}
                <span class="block text-[10px] text-slate-400 font-bold mt-0.5">${e.lotesAtivos} lote(s) ativo(s) de ${e.lotesTotal}</span>
            </td>
            <td class="p-3 text-center"><span class="px-3 py-1 rounded-full text-xs font-black ${dispCls}">${e.disponivel}</span></td>
            <td class="p-3 text-center text-xs font-bold text-indigo-600">${e.reservado}</td>
            <td class="p-3 text-center text-xs font-bold text-slate-500">${e.aplicado}</td>
            <td class="p-3 text-center text-xs font-bold text-slate-700">${e.total}</td>
            <td class="p-3 text-center">${statusBadge}</td>
        </tr>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
//  MÓDULO: LOTES
// ═══════════════════════════════════════════════════════════════════════════
function setLoteFilter(tipo) {
    loteFilter = tipo;
    document.querySelectorAll('.lf-btn').forEach(b => {
        b.classList.remove('bg-green-600', 'text-white', 'shadow');
        b.classList.add('text-slate-500', 'hover:bg-white');
    });
    const active = document.getElementById('lf-btn-' + tipo);
    if (active) { active.classList.add('bg-green-600', 'text-white', 'shadow'); active.classList.remove('text-slate-500', 'hover:bg-white'); }
    renderAlmoxLotes();
}

function renderAlmoxLotes() {
    const tbody = document.getElementById('alm-lotes-body');
    if (!tbody) return;
    const today = new Date(); today.setHours(0,0,0,0);

    const allLotes = vaccineLots.map(l => {
        const v = vaccines.find(x => x.id == l.vaccineId);
        return { lote: l, vaccineName: v ? v.nome : '—', estoque: getLoteEstoque(l.id) };
    });

    const filtered = allLotes.filter(({ lote }) => {
        const ativo = lote.status === 'aberto';
        if (loteFilter === 'ativos')   return ativo;
        if (loteFilter === 'inativos') return !ativo;
        return true;
    });

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">Nenhum lote encontrado</td></tr>`;
        return;
    }

    filtered.sort((a, b) => {
        if (a.vaccineName !== b.vaccineName) return a.vaccineName.localeCompare(b.vaccineName, 'pt-BR');
        return new Date(a.lote.validade || 0) - new Date(b.lote.validade || 0);
    });

    tbody.innerHTML = filtered.map(({ lote, vaccineName, estoque }) => {
        const ativo = lote.status === 'aberto';
        const vencido = lote.validade && new Date(lote.validade + 'T00:00:00') < today;
        const validade = lote.validade ? lote.validade.split('-').reverse().join('/') : '—';
        const dispCls = estoque.disponivel <= 0 ? 'bg-slate-100 text-slate-400' : estoque.disponivel <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';
        return `<tr class="hover:bg-slate-50 transition ${!ativo ? 'opacity-60' : ''}">
            <td class="p-3 font-bold text-slate-700">${vaccineName}</td>
            <td class="p-3 text-xs font-mono font-bold">${lote.numero || '—'}</td>
            <td class="p-3 text-center"><span class="px-2.5 py-1 rounded-full text-xs font-black ${dispCls}">${estoque.disponivel}</span></td>
            <td class="p-3 text-center text-xs font-bold text-indigo-600">${estoque.reservado}</td>
            <td class="p-3 text-center text-xs font-bold text-slate-700">${estoque.total}</td>
            <td class="p-3 text-xs ${vencido ? 'text-red-600 font-black' : 'text-slate-600'}">${validade}${vencido ? ' <i class="fas fa-exclamation-triangle ml-1"></i>' : ''}</td>
            <td class="p-3 text-center">
                <span class="px-2 py-1 rounded-full text-[10px] font-black uppercase ${ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">${ativo ? 'Ativo' : 'Inativo'}</span>
                ${(!ativo && lote._autoFechado) ? '<span class="block text-[8px] text-slate-400 font-bold mt-0.5">zerado</span>' : ''}
            </td>
            <td class="p-3 text-center">
                <div class="flex justify-center gap-1.5">
                    ${permBtn('lotes_fechar_abrir', `<button onclick="openMovimentacaoEntrada(${lote.id})" class="h-8 w-8 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded transition shadow-sm" title="Registrar entrada"><i class="fas fa-arrow-down text-[10px]"></i></button>`)}
                    ${permBtn('lotes_fechar_abrir', `<button onclick="openMovimentacaoSaida(${lote.id})" class="h-8 w-8 bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white rounded transition shadow-sm" title="Registrar saída / descarte"><i class="fas fa-arrow-up text-[10px]"></i></button>`)}
                    ${permBtn('lotes_fechar_abrir', `<button onclick="openLoteModal(${lote.vaccineId})" class="h-8 w-8 bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white rounded transition shadow-sm" title="Gerenciar lotes da vacina"><i class="fas fa-list-check text-[10px]"></i></button>`)}
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
//  MÓDULO: MOVIMENTAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
let _movPendingTipo = 'entrada';   // entrada | saida
let _movPendingLoteId = null;
let _movSaidaDescarte = false;

function renderMovimentacao() {
    const tbody = document.getElementById('mov-body');
    if (!tbody) return;
    const movs = [...stockMovements].sort((a, b) => new Date(b.data) - new Date(a.data));
    if (!movs.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">Nenhuma movimentação registrada</td></tr>`;
        return;
    }
    tbody.innerHTML = movs.map(m => {
        const lote = vaccineLots.find(l => l.id == m.loteId);
        const v = lote ? vaccines.find(x => x.id == lote.vaccineId) : null;
        const isEntrada = m.tipo === 'entrada';
        const tipoBadge = isEntrada
            ? `<span class="px-2 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700"><i class="fas fa-arrow-down mr-1"></i>Entrada</span>`
            : m.descarte
                ? `<span class="px-2 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700"><i class="fas fa-trash mr-1"></i>Descarte</span>`
                : `<span class="px-2 py-1 rounded-full text-[10px] font-black uppercase bg-orange-100 text-orange-700"><i class="fas fa-arrow-up mr-1"></i>Saída</span>`;
        const dataStr = m.data ? new Date(m.data).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
        return `<tr class="hover:bg-slate-50 transition">
            <td class="p-3 text-xs text-slate-500 font-bold whitespace-nowrap">${dataStr}</td>
            <td class="p-3">${tipoBadge}</td>
            <td class="p-3 font-bold text-slate-700 text-xs">${v ? v.nome : '—'}<span class="block text-[10px] text-slate-400 font-mono">Lote ${lote ? lote.numero : '—'}</span></td>
            <td class="p-3 text-center"><span class="font-black ${isEntrada ? 'text-emerald-600' : 'text-orange-600'}">${isEntrada ? '+' : '−'}${m.qtd}</span></td>
            <td class="p-3 text-xs text-slate-600">${m.motivo || '—'}</td>
            <td class="p-3 text-xs text-slate-400 font-bold">${m.usuario || '—'}</td>
        </tr>`;
    }).join('');
}

// Abre o modal de movimentação a partir de um lote específico
function openMovimentacaoEntrada(loteId) { openMovModal('entrada', loteId); }
function openMovimentacaoSaida(loteId)   { openMovModal('saida', loteId); }

function openMovModal(tipo, loteId) {
    if (!checkPerm('lotes_fechar_abrir')) return;
    _movPendingTipo = tipo;
    _movPendingLoteId = loteId || null;
    _movSaidaDescarte = false;

    document.getElementById('mov-form').reset();
    document.getElementById('mov-qtd').value = '';
    document.getElementById('mov-motivo').value = '';

    // Cabeçalho conforme tipo
    const isEntrada = tipo === 'entrada';
    document.getElementById('mov-modal-title').textContent = isEntrada ? 'Registrar Entrada' : 'Registrar Saída';
    const head = document.getElementById('mov-modal-head');
    head.className = `p-5 text-white flex items-center gap-3 ${isEntrada ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : 'bg-gradient-to-br from-orange-600 to-orange-800'}`;
    document.getElementById('mov-modal-icon').className = `fas ${isEntrada ? 'fa-arrow-down' : 'fa-arrow-up'} text-white text-base`;

    // Bloco de descarte só aparece em saída
    document.getElementById('mov-descarte-wrap').classList.toggle('hidden', isEntrada);
    document.getElementById('mov-motivo-label').textContent = isEntrada ? 'Observação (opcional)' : 'Justificativa *';
    setMovDescarte(false);

    // Popula select de vacina → lote
    populateMovVaccineSelect();
    if (loteId) {
        const lote = vaccineLots.find(l => l.id == loteId);
        if (lote) {
            document.getElementById('mov-vacina').value = lote.vaccineId;
            populateMovLoteSelect(lote.vaccineId);
            document.getElementById('mov-lote').value = loteId;
            onMovLoteChange();
        }
    } else {
        populateMovLoteSelect(null);
    }
    document.getElementById('modal-movimentacao').classList.add('active');
}

function populateMovVaccineSelect() {
    const sel = document.getElementById('mov-vacina');
    sel.innerHTML = '<option value="">Selecione a vacina...</option>';
    vaccines.filter(v => v.ativo !== false).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).forEach(v => {
        sel.innerHTML += `<option value="${v.id}">${v.nome}</option>`;
    });
}

function onMovVaccineChange() {
    const vId = document.getElementById('mov-vacina').value;
    populateMovLoteSelect(vId);
    onMovLoteChange();
}

function populateMovLoteSelect(vaccineId) {
    const sel = document.getElementById('mov-lote');
    sel.innerHTML = '<option value="">Selecione o lote...</option>';
    if (!vaccineId) return;
    // Em entrada mostramos todos os lotes (inclusive fechados/zerados, para reabastecer)
    // Em saída mostramos apenas lotes com disponível > 0
    const lotes = vaccineLots.filter(l => l.vaccineId == vaccineId)
        .sort((a, b) => new Date(a.validade || 0) - new Date(b.validade || 0));
    lotes.forEach(l => {
        const e = getLoteEstoque(l.id);
        if (_movPendingTipo === 'saida' && e.disponivel <= 0) return;
        const validade = l.validade ? l.validade.split('-').reverse().join('/') : 's/ val';
        sel.innerHTML += `<option value="${l.id}">Lote ${l.numero} — ${validade} (disp: ${e.disponivel})</option>`;
    });
}

function onMovLoteChange() {
    const loteId = document.getElementById('mov-lote').value;
    const info = document.getElementById('mov-estoque-info');
    if (!loteId) { info.classList.add('hidden'); return; }
    const e = getLoteEstoque(loteId);
    document.getElementById('mov-info-disp').textContent = e.disponivel;
    document.getElementById('mov-info-reserv').textContent = e.reservado;
    document.getElementById('mov-info-total').textContent = e.total;
    info.classList.remove('hidden');
}

function setMovDescarte(isDescarte) {
    _movSaidaDescarte = isDescarte;
    const btnSim = document.getElementById('mov-descarte-sim');
    const btnNao = document.getElementById('mov-descarte-nao');
    if (isDescarte) {
        btnSim.className = 'flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition bg-red-600 text-white shadow';
        btnNao.className = 'flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition text-slate-500 hover:bg-slate-100';
    } else {
        btnNao.className = 'flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition bg-slate-600 text-white shadow';
        btnSim.className = 'flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition text-slate-500 hover:bg-slate-100';
    }
}

function confirmMovimentacao(e) {
    e.preventDefault();
    const loteId = document.getElementById('mov-lote').value;
    const qtd = parseInt(document.getElementById('mov-qtd').value, 10);
    const motivo = document.getElementById('mov-motivo').value.trim();
    const isEntrada = _movPendingTipo === 'entrada';

    if (!loteId) { showNotification('Selecione o lote.', 'error'); return; }
    if (!qtd || qtd <= 0) { showNotification('Informe uma quantidade válida (maior que zero).', 'error'); return; }

    const lote = vaccineLots.find(l => l.id == loteId);
    const v = lote ? vaccines.find(x => x.id == lote.vaccineId) : null;
    const estoque = getLoteEstoque(loteId);

    if (isEntrada) {
        // nada a validar além de qtd > 0
    } else {
        // SAÍDA: justificativa obrigatória e não permitir estoque negativo
        if (!motivo) { showNotification('A justificativa é obrigatória para saídas.', 'error'); return; }
        if (qtd > estoque.disponivel) {
            showNotification(`Saída inválida: disponível é ${estoque.disponivel}, não é possível retirar ${qtd}.`, 'error');
            return;
        }
    }

    const mov = {
        id: Date.now(),
        loteId: Number(loteId),
        vaccineId: lote ? Number(lote.vaccineId) : null,
        tipo: _movPendingTipo,
        qtd,
        motivo: motivo || (isEntrada ? 'Entrada de estoque' : ''),
        descarte: !isEntrada && _movSaidaDescarte,
        data: new Date().toISOString(),
        usuario: currentUser ? currentUser.nome : '—'
    };
    stockMovements.push(mov);

    // Atualiza status do lote (reativa se entrou estoque / fecha se zerou)
    syncLoteStatus(loteId);

    const acao = isEntrada ? 'Entrada' : (_movSaidaDescarte ? 'Descarte' : 'Saída');
    logAudit(acao, 'lote', String(lote ? lote.vaccineId : loteId),
        `Lote ${lote ? lote.numero : loteId}`,
        `${v ? v.nome : '—'} | ${isEntrada ? '+' : '−'}${qtd} un.${motivo ? ' | ' + motivo : ''}`);

    saveAll();
    document.getElementById('modal-movimentacao').classList.remove('active');
    renderMovimentacao(); renderAlmoxLotes(); renderEstoqueDashboard(); renderVaccines();
    updateExpiryBadge();
    showNotification(`${acao} registrada com sucesso!`, 'success');
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
