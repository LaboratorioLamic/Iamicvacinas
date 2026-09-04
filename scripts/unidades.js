// ─── UNIDADES DE COLETA ──────────────────────────────────────────────────────
// Onde a vacina é aplicada quando o Local da Aplicação é "Laboratório". O
// cadastro vive em Configurações → Unidades e é fechado pela permissão de
// sistema `gerenciar_unidades`: ver a lista suspensa no agendamento é de todos,
// mexer no cadastro não.

const UNIDADE_CAMPOS_END = ['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado'];

function canGerenciarUnidades() {
    return isCurrentUserAdmin() || hasPerm('gerenciar_unidades');
}

function unidadeById(id) {
    if (id == null || id === '') return null;
    return unidades.find(u => String(u.id) === String(id)) || null;
}

// Unidade excluída depois do agendamento deixaria o histórico sem rótulo; o id
// vira um nome genérico para o registro continuar legível.
function unidadeNome(id) {
    const u = unidadeById(id);
    if (u) return u.nome;
    return id ? 'Unidade removida' : '';
}

function unidadesOrdenadas() {
    return unidades.slice().sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
}

function unidadeEnderecoResumo(u) {
    if (!u || !u.endereco) return '';
    const e = u.endereco;
    const rua = [e.logradouro, e.numero].filter(Boolean).join(', ');
    return [rua, e.bairro, [e.cidade, e.estado].filter(Boolean).join('/')].filter(Boolean).join(' · ');
}

// ─── LISTA SUSPENSA NO AGENDAMENTO ───────────────────────────────────────────
// Só unidades ativas entram na lista. A exceção é a unidade já gravada num
// agendamento antigo (`incluirId`): sem ela na lista o select cairia para vazio
// e o registro perderia a unidade só por ter sido reaberto.
function populateUnidadeSelects(incluirId) {
    ['reg-unidade', 'grpend-unidade'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const anterior = sel.value;
        const lista = unidadesOrdenadas().filter(u => u.ativo !== false || String(u.id) === String(incluirId));
        sel.innerHTML = '<option value="">Selecione a unidade...</option>' + lista.map(u => {
            const inativa = u.ativo === false ? ' (inativa)' : '';
            return `<option value="${u.id}">${u.nome}${inativa}</option>`;
        }).join('');
        if (!lista.length) {
            sel.innerHTML = '<option value="">Nenhuma unidade cadastrada</option>';
        }
        // Restaura a escolha anterior quando ela ainda existe na lista.
        if (anterior && lista.some(u => String(u.id) === String(anterior))) sel.value = anterior;
    });
}

// ─── CADASTRO (Configurações → Unidades) ─────────────────────────────────────

let _editUnidadeId = null;
let _pendingDeleteUnidadeId = null;

function renderUnidadesList() {
    const el = document.getElementById('unidades-list');
    if (!el) return;
    const badge = document.getElementById('unidades-count-badge');
    if (badge) badge.textContent = unidades.length + (unidades.length === 1 ? ' unidade' : ' unidades');

    if (!unidades.length) {
        el.innerHTML = `<div class="flex flex-col items-center justify-center py-16 text-center">
            <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <i class="fas fa-hospital text-slate-300 text-2xl"></i>
            </div>
            <p class="text-sm font-black text-slate-400 uppercase tracking-wider">Nenhuma unidade</p>
            <p class="text-xs text-slate-300 mt-1">Cadastre a primeira unidade no painel ao lado</p>
        </div>`;
        return;
    }

    const podeGerenciar = canGerenciarUnidades();
    el.innerHTML = unidadesOrdenadas().map(u => {
        const ativa = u.ativo !== false;
        const usos = (typeof appointments !== 'undefined')
            ? appointments.filter(a => a.endereco && String(a.endereco.unidadeId) === String(u.id)).length
            : 0;
        const resumo = unidadeEnderecoResumo(u);
        const initials = String(u.nome || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
        return `<div class="group bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 ${ativa ? '' : 'opacity-70'}">
            <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${ativa ? 'from-clinic-600 to-clinic-700' : 'from-slate-400 to-slate-500'} flex items-center justify-center shrink-0 shadow-sm">
                        <span class="text-white font-black text-xs">${initials}</span>
                    </div>
                    <div class="min-w-0">
                        <h5 class="font-black text-navy-900 text-sm truncate flex items-center gap-1.5">
                            ${u.nome}
                            ${ativa ? '' : '<span class="inline-flex items-center px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 text-[9px] font-black rounded-full uppercase">Inativa</span>'}
                        </h5>
                        <p class="text-[10px] text-slate-400 font-semibold truncate">${resumo || 'Sem endereço informado'}</p>
                        <p class="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                            <i class="fas fa-syringe text-[9px]"></i>
                            ${usos} agendamento${usos !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div class="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${podeGerenciar ? `<button onclick="toggleUnidadeAtiva(${u.id})" class="h-8 w-8 bg-slate-100 text-slate-500 hover:bg-amber-500 hover:text-white rounded-xl transition text-xs flex items-center justify-center shadow-sm" title="${ativa ? 'Desativar unidade' : 'Reativar unidade'}"><i class="fas ${ativa ? 'fa-toggle-on' : 'fa-toggle-off'} text-[10px]"></i></button>` : ''}
                    ${podeGerenciar ? `<button onclick="editUnidade(${u.id})" class="h-8 w-8 bg-slate-100 text-slate-500 hover:bg-blue-500 hover:text-white rounded-xl transition text-xs flex items-center justify-center shadow-sm" title="Editar unidade"><i class="fas fa-pen text-[10px]"></i></button>` : ''}
                    ${podeGerenciar && usos === 0 ? `<button onclick="deleteUnidade(${u.id})" class="h-8 w-8 bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white rounded-xl transition text-xs flex items-center justify-center shadow-sm" title="Excluir unidade"><i class="fas fa-trash text-[10px]"></i></button>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

function resetUnidadeForm() {
    _editUnidadeId = null;
    const form = document.getElementById('unidade-form');
    if (form) form.reset();
    document.getElementById('unidade-form-title').textContent = 'Nova Unidade';
    document.getElementById('unidade-form-icon').className = 'fas fa-plus text-clinic-600 text-xs';
}

function editUnidade(id) {
    if (!checkPerm('gerenciar_unidades')) return;
    const u = unidadeById(id);
    if (!u) return;
    _editUnidadeId = u.id;
    document.getElementById('unidade-nome').value = u.nome || '';
    const end = u.endereco || {};
    UNIDADE_CAMPOS_END.forEach(c => {
        const el = document.getElementById('unidade-' + c);
        if (el) el.value = end[c] || '';
    });
    document.getElementById('unidade-form-title').textContent = 'Editar Unidade';
    document.getElementById('unidade-form-icon').className = 'fas fa-pen text-clinic-600 text-xs';
    document.getElementById('unidade-nome').focus();
}

// Mesma consulta do endereço do agendamento, sem a máquina de prefixos: aqui há
// um único formulário e ele não concorre com nenhum outro.
async function buscarCepUnidade() {
    const cepEl = document.getElementById('unidade-cep');
    if (!cepEl) return;
    const cep = cepEl.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
        const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await resp.json();
        if (data.erro) { showNotification('CEP não encontrado.', 'error'); return; }
        const set = (campo, valor) => {
            const el = document.getElementById('unidade-' + campo);
            if (el && valor) el.value = String(valor).toUpperCase();
        };
        set('logradouro', data.logradouro);
        set('bairro', data.bairro);
        set('cidade', data.localidade);
        set('estado', data.uf);
        document.getElementById('unidade-numero')?.focus();
    } catch (err) {
        showNotification('Não foi possível consultar o CEP. Verifique sua conexão.', 'error');
    }
}

function saveUnidade(e) {
    e.preventDefault();
    if (!checkPerm('gerenciar_unidades')) return;

    const nome = document.getElementById('unidade-nome').value.trim().toUpperCase();
    if (!nome) { showNotification('Informe o nome da unidade.', 'error'); return; }

    const dup = unidades.find(u => String(u.nome || '').toUpperCase() === nome && String(u.id) !== String(_editUnidadeId));
    if (dup) { showNotification('Já existe uma unidade com este nome.', 'error'); return; }

    const endereco = {};
    UNIDADE_CAMPOS_END.forEach(c => {
        const v = (document.getElementById('unidade-' + c)?.value || '').trim();
        endereco[c] = c === 'cep' ? v : v.toUpperCase();
    });

    const labels = { nome: 'Nome', cep: 'CEP', logradouro: 'Logradouro', numero: 'Número', bairro: 'Bairro', cidade: 'Cidade', estado: 'UF' };
    const achatar = u => ({ nome: u.nome, ...(u.endereco || {}) });

    if (_editUnidadeId != null) {
        const idx = unidades.findIndex(u => String(u.id) === String(_editUnidadeId));
        if (idx > -1) {
            const antes = achatar(unidades[idx]);
            unidades[idx] = { ...unidades[idx], nome, endereco };
            const changes = computeChanges(antes, achatar(unidades[idx]), labels);
            if (changes.length) logAudit('Editado', 'unidade', unidades[idx].id, nome, null, changes);
        }
        showNotification('Unidade atualizada com sucesso!', 'success');
    } else {
        const nova = { id: Date.now(), nome, ativo: true, endereco };
        unidades.push(nova);
        logAudit('Criado', 'unidade', nova.id, nome, unidadeEnderecoResumo(nova) || null);
        showNotification('Unidade cadastrada com sucesso!', 'success');
    }

    saveUnidades();
    resetUnidadeForm();
    renderUnidadesList();
    populateUnidadeSelects();
}

function toggleUnidadeAtiva(id) {
    if (!checkPerm('gerenciar_unidades')) return;
    const idx = unidades.findIndex(u => String(u.id) === String(id));
    if (idx < 0) return;
    const ativa = unidades[idx].ativo !== false;
    unidades[idx].ativo = !ativa;
    logAudit('Editado', 'unidade', unidades[idx].id, unidades[idx].nome,
        ativa ? 'Unidade desativada' : 'Unidade reativada');
    saveUnidades();
    renderUnidadesList();
    populateUnidadeSelects();
    showNotification(ativa ? 'Unidade desativada.' : 'Unidade reativada.', 'success');
}

// Excluir some com a unidade do histórico dos agendamentos; por isso só passa
// quando nenhum agendamento aponta para ela. Para tirar de circulação sem perder
// o histórico existe o botão de desativar.
function deleteUnidade(id) {
    if (!checkPerm('gerenciar_unidades')) return;
    const u = unidadeById(id);
    if (!u) return;
    const usos = (typeof appointments !== 'undefined')
        ? appointments.filter(a => a.endereco && String(a.endereco.unidadeId) === String(u.id)).length
        : 0;
    if (usos > 0) {
        showNotification(`Não é possível excluir: ${usos} agendamento(s) usam esta unidade. Desative-a em vez de excluir.`, 'error');
        return;
    }
    showConfirmDanger(`Excluir a unidade "${u.nome}"?`, () => {
        unidades = unidades.filter(x => String(x.id) !== String(u.id));
        logAudit('Excluído', 'unidade', u.id, u.nome, unidadeEnderecoResumo(u) || null);
        saveUnidades();
        resetUnidadeForm();
        renderUnidadesList();
        populateUnidadeSelects();
        showNotification('Unidade excluída.', 'success');
    });
}
