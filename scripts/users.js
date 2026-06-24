// ─── USER & GROUP MANAGEMENT (from index.html lines ~6176-6562) ──────────────

function setUserStatusFilter(filter) {
    userStatusFilter = filter;
    const btnA = document.getElementById('btn-users-ativos');
    const btnI = document.getElementById('btn-users-inativos');
    if (btnA && btnI) {
        const activeClass = 'px-4 py-1.5 rounded-lg text-xs font-black uppercase transition bg-navy-900 text-white shadow';
        const inactiveClass = 'px-4 py-1.5 rounded-lg text-xs font-black uppercase transition text-slate-500 hover:bg-slate-200';
        btnA.className = filter === 'ativos' ? activeClass : inactiveClass;
        btnI.className = filter === 'inativos' ? activeClass : inactiveClass;
    }
    renderUsersList();
}

function renderUsersList() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (appUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400 text-sm font-bold">Nenhum usuário cadastrado.</td></tr>';
        return;
    }
    const canEditUsers = isCurrentUserAdmin() || hasPerm('criar_editar_usuarios');
    const filteredUsers = appUsers.filter(u =>
        userStatusFilter === 'inativos' ? u.ativo === false : u.ativo !== false
    );
    const sortedUsers = [...filteredUsers].sort((a, b) => {
        const gA = appGroups.find(g => g.id == a.grupoId)?.nome || (a.isAdmin ? '\x00' : '\xFF');
        const gB = appGroups.find(g => g.id == b.grupoId)?.nome || (b.isAdmin ? '\x00' : '\xFF');
        if (gA < gB) return -1;
        if (gA > gB) return 1;
        return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    });
    if (sortedUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400 text-sm font-bold">Nenhum usuário ${userStatusFilter === 'inativos' ? 'inativo' : 'ativo'}.</td></tr>`;
        return;
    }
    sortedUsers.forEach(u => {
        const group    = appGroups.find(g => g.id == u.grupoId);
        const isSelf   = currentUser && u.id == currentUser.id;
        const inativo  = u.ativo === false;
        const hasAppts = appointments.some(a => a.vendedor === u.nome || a.aplicador === u.nome || a.patientId == u.id);
        const canDel   = !isSelf && !hasAppts && (isCurrentUserAdmin() || (canEditUsers && !u.isAdmin));
        const funcoes  = [u.isVendedor ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-700">Vendedor</span>' : '', u.isAplicador ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-green-100 text-green-700">Aplicador</span>' : ''].filter(Boolean).join(' ') || '—';
        const rowClass = inativo ? 'bg-slate-100 text-slate-400 opacity-70' : 'hover:bg-slate-50';
        tbody.innerHTML += `<tr class="${rowClass} transition">
            <td class="p-3 font-bold text-sm ${inativo ? 'text-slate-400' : 'text-navy-900'}">${u.nome}</td>
            <td class="p-3 text-xs ${inativo ? 'text-slate-400' : 'text-slate-500'}">${u.cpf || '—'}</td>
            <td class="p-3 text-xs font-bold">${u.login}</td>
            <td class="p-3 text-xs">${u.isAdmin ? '<span class="text-navy-800 font-bold">Administrador Geral</span>' : (group ? group.nome : '<span class="text-red-400">Sem grupo</span>')}</td>
            <td class="p-3 text-center">
                <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${u.isAdmin ? 'bg-blue-100 text-navy-800' : 'bg-blue-100 text-blue-700'}">${u.isAdmin ? 'Admin' : 'Usuário'}</span>
                ${isSelf ? '<span class="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-green-100 text-green-700">Você</span>' : ''}
            </td>
            <td class="p-3 text-center text-xs">${funcoes}</td>
            <td class="p-3 text-center">
                ${u.isAdmin ? '<span class="text-[9px] text-slate-400">—</span>' : `<span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${inativo ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}">${inativo ? 'Inativo' : 'Ativo'}</span>`}
            </td>
            <td class="p-3 text-center">
                <div class="flex justify-center gap-1">
                    ${canEditUsers ? `<button onclick="editUser(${u.id})" class="h-7 w-7 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded transition text-xs shadow-sm" title="Editar"><i class="fas fa-pen"></i></button>` : ''}
                    ${canEditUsers && !u.isAdmin && !isSelf ? `<button onclick="toggleUserActive(${u.id})" class="h-7 w-7 ${inativo ? 'bg-orange-50 text-orange-500 hover:bg-orange-500' : 'bg-green-50 text-green-600 hover:bg-green-500'} hover:text-white rounded transition text-xs shadow-sm" title="${inativo ? 'Ativar' : 'Inativar'}"><i class="fas ${inativo ? 'fa-toggle-off' : 'fa-toggle-on'}"></i></button>` : ''}
                    ${canDel ? `<button onclick="deleteUser(${u.id})" class="h-7 w-7 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded transition text-xs shadow-sm" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </td>
        </tr>`;
    });
}

function toggleUserActive(id) {
    const u = appUsers.find(x => x.id == id);
    if (!u) return;
    u.ativo = u.ativo === false ? true : false;
    saveUsersData();
    renderUsersList();
    showNotification(`Usuário ${u.ativo ? 'ativado' : 'inativado'} com sucesso.`, u.ativo ? 'success' : 'warning');
}

function toggleAdminGeralCheck() {
    const isAdmin = document.getElementById('new-user-is-admin').checked;
    const grupoDiv = document.getElementById('div-user-grupo');
    const grupoSel = document.getElementById('new-user-grupo');
    if (isAdmin) {
        grupoDiv.style.display = 'none';
        grupoSel.required = false;
        grupoSel.value = '';
    } else {
        grupoDiv.style.display = '';
        grupoSel.required = true;
    }
}

function resetUserForm() {
    document.getElementById('new-user-form').reset();
    document.getElementById('edit-user-id').value = '';
    const lbl  = document.getElementById('lbl-new-user-senha');
    const hint = document.getElementById('hint-edit-senha');
    if (lbl)  lbl.textContent = 'Senha *';
    if (hint) hint.classList.add('hidden');
    document.getElementById('new-user-senha').required = true;
    const grupoDiv = document.getElementById('div-user-grupo');
    const grupoSel = document.getElementById('new-user-grupo');
    grupoDiv.style.display = '';
    grupoSel.required = true;
    document.getElementById('new-user-vendedor').checked = false;
    document.getElementById('new-user-aplicador').checked = false;
    document.getElementById('new-user-is-admin').checked = false;
    const adminBlock = document.getElementById('div-user-admin-geral');
    if (adminBlock) adminBlock.classList.toggle('hidden', !isCurrentUserAdmin());
    populateGroupSelect();
}

function openNewUser() {
    switchUsersSubTab('novo');
    resetUserForm();
}

function editUser(id) {
    const u = appUsers.find(x => x.id == id);
    if (!u) return;
    switchUsersSubTab('novo');
    setTimeout(() => {
        document.getElementById('edit-user-id').value = u.id;
        document.getElementById('new-user-nome').value  = u.nome;
        document.getElementById('new-user-cpf').value   = u.cpf || '';
        document.getElementById('new-user-login').value = u.login;
        document.getElementById('new-user-senha').value = '';
        document.getElementById('new-user-senha2').value = '';
        document.getElementById('new-user-senha').required = false;
        document.getElementById('new-user-senha2').required = false;
        const hint = document.getElementById('hint-edit-senha');
        const lbl  = document.getElementById('lbl-new-user-senha');
        const lbl2 = document.getElementById('lbl-new-user-senha2');
        if (hint) hint.classList.remove('hidden');
        if (lbl)  lbl.textContent = 'Senha';
        if (lbl2) lbl2.textContent = 'Confirmar Senha';
        const grupoDiv = document.getElementById('div-user-grupo');
        const grupoSel = document.getElementById('new-user-grupo');
        if (u.isAdmin) {
            grupoDiv.style.display = 'none';
            grupoSel.required = false;
            grupoSel.value = '';
            // Popula o select mesmo oculto para que ao desmarcar admin as opções já estejam disponíveis
            populateGroupSelect();
        } else {
            grupoDiv.style.display = '';
            grupoSel.required = true;
            grupoSel.value = u.grupoId || '';
        }
        document.getElementById('new-user-vendedor').checked = !!u.isVendedor;
        document.getElementById('new-user-aplicador').checked = !!u.isAplicador;
        const adminBlock = document.getElementById('div-user-admin-geral');
        if (adminBlock) adminBlock.classList.toggle('hidden', !isCurrentUserAdmin());
        const adminCheck = document.getElementById('new-user-is-admin');
        if (adminCheck) adminCheck.checked = !!u.isAdmin;
    }, 50);
}

function openEditUser(id) { editUser(id); }

function saveUser(e) {
    e.preventDefault();
    if (!isCurrentUserAdmin() && !hasPerm('criar_editar_usuarios')) {
        showNotification('Acesso negado: você não tem permissão para criar ou editar usuários.', 'error');
        return;
    }
    const id         = document.getElementById('edit-user-id').value;
    const nome       = document.getElementById('new-user-nome').value.trim().toUpperCase();
    const cpf        = document.getElementById('new-user-cpf').value.trim();
    const login      = document.getElementById('new-user-login').value.trim();
    const senha      = document.getElementById('new-user-senha').value;
    const senha2     = document.getElementById('new-user-senha2').value;
    const grupoEl    = document.getElementById('new-user-grupo');
    const isVendedor = document.getElementById('new-user-vendedor').checked;
    const isAplicador= document.getElementById('new-user-aplicador').checked;
    const newIsAdmin = isCurrentUserAdmin() && document.getElementById('new-user-is-admin').checked;

    const editingUser = id ? appUsers.find(u => String(u.id) === String(id)) : null;
    const isAdminUser = newIsAdmin;

    const grupoId = (!isAdminUser && grupoEl.value) ? Number(grupoEl.value) : null;
    if (!isAdminUser && !grupoId) { showNotification('Selecione um grupo para o usuário.', 'error'); return; }

    if (!/^[a-z0-9]+$/.test(login)) { showNotification('Login inválido: use apenas letras minúsculas e números, sem espaços ou caracteres especiais.', 'error'); return; }
    const loginExists = appUsers.find(u => u.login === login && String(u.id) !== String(id));
    if (loginExists) { showNotification('Este login já está em uso por outro usuário.', 'error'); return; }

    if (senha && senha !== senha2) { showNotification('As senhas não conferem.', 'error'); return; }
    if (!id && !senha) { showNotification('Informe uma senha para o novo usuário.', 'error'); return; }

    if (id) {
        const idx = appUsers.findIndex(u => String(u.id) === String(id));
        if (idx > -1) {
            const oldUser = {...appUsers[idx]};
            const oldGrpName = (appGroups.find(g => g.id == oldUser.grupoId) || {}).nome || '—';
            appUsers[idx].nome       = nome;
            appUsers[idx].cpf        = cpf;
            appUsers[idx].login      = login;
            appUsers[idx].isVendedor = isVendedor;
            appUsers[idx].isAplicador= isAplicador;
            if (isCurrentUserAdmin()) { appUsers[idx].isAdmin = newIsAdmin; appUsers[idx].grupoId = isAdminUser ? null : grupoId; }
            if (senha) appUsers[idx].senhaHash = hashPwd(senha);
            const newGrpName = (appGroups.find(g => g.id == appUsers[idx].grupoId) || {}).nome || '—';
            const oldFlat = {...oldUser, grupoNome: oldGrpName, isVendedorStr: oldUser.isVendedor ? 'Sim' : 'Não', isAplicadorStr: oldUser.isAplicador ? 'Sim' : 'Não', isAdminStr: oldUser.isAdmin ? 'Sim' : 'Não'};
            const newFlat = {...appUsers[idx], grupoNome: newGrpName, isVendedorStr: isVendedor ? 'Sim' : 'Não', isAplicadorStr: isAplicador ? 'Sim' : 'Não', isAdminStr: appUsers[idx].isAdmin ? 'Sim' : 'Não'};
            const userChanges = computeChanges(oldFlat, newFlat, {nome:'Nome', cpf:'CPF', login:'Login', grupoNome:'Grupo', isVendedorStr:'Vendedor', isAplicadorStr:'Aplicador', isAdminStr:'Admin Geral'});
            logAudit('Editado', 'usuario', id, nome, null, userChanges);
            if (currentUser && appUsers[idx].id == currentUser.id) {
                currentUser.nome  = nome;
                currentUser.login = login;
                localStorage.setItem('ig_session', JSON.stringify(currentUser));
                updateUserUI();
            }
            // Propaga renomeação nos agendamentos
            if (oldUser.nome !== nome) {
                let renamed = false;
                appointments.forEach(a => {
                    if (a.vendedor === oldUser.nome) { a.vendedor = nome; renamed = true; }
                    if (a.aplicador === oldUser.nome) { a.aplicador = nome; renamed = true; }
                });
                if (renamed) saveAll();
            }
        }
    } else {
        if (!senha || senha.length < 6) { showNotification('Informe uma senha com ao menos 6 caracteres.', 'error'); return; }
        const newUserId = Date.now();
        appUsers.push({ id: newUserId, nome, cpf, login, senhaHash: hashPwd(senha), grupoId: isAdminUser ? null : grupoId, isAdmin: newIsAdmin, isVendedor, isAplicador });
        logAudit('Criado', 'usuario', newUserId, nome, `Login: ${login}`);
    }
    saveUsersData();
    showNotification('Usuário salvo com sucesso!', 'success');
    resetUserForm();
    switchUsersSubTab('lista');
}

function deleteUser(id) {
    const u = appUsers.find(x => String(x.id) === String(id));
    if (!u) return;
    _pendingDeleteUserId = id;
    document.getElementById('delete-user-info').textContent = u.nome + (u.login ? ' · @' + u.login : '');
    document.getElementById('delete-user-input').value = '';
    checkDeleteUserConfirm();
    document.getElementById('modal-delete-user').classList.add('active');
}

function checkDeleteUserConfirm() {
    const val = (document.getElementById('delete-user-input').value || '').trim().toUpperCase();
    const btn = document.getElementById('btn-confirm-delete-user');
    const ok = val === 'SIM';
    btn.disabled = !ok;
    btn.className = ok
        ? 'flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl uppercase text-xs transition cursor-pointer'
        : 'flex-1 bg-red-200 text-red-400 font-black py-3 rounded-xl uppercase text-xs transition cursor-not-allowed';
}

function confirmDeleteUser() {
    if (!_pendingDeleteUserId) return;
    appUsers = appUsers.filter(u => String(u.id) !== String(_pendingDeleteUserId));
    _pendingDeleteUserId = null;
    saveUsersData();
    renderUsersList();
    document.getElementById('modal-delete-user').classList.remove('active');
    document.getElementById('delete-user-input').value = '';
    showNotification('Usuário excluído.', 'success');
}

// ─── CRUD GRUPOS ──────────────────────────────────────────────────────────────

const _CAT_COLORS = {
    agendar: 'blue', criar_agendamento: 'blue', aplicar: 'blue', definir_feriados: 'blue',
    adicionar_paciente: 'emerald', editar_paciente: 'emerald',
    leitura_estoque: 'violet', criar_produtos: 'violet', edicao_lotes: 'violet', edicao_movimentacao: 'violet',
    baixar_pdf: 'orange',
    ver_dashboard: 'amber', ver_dash_financeiro: 'emerald', ver_agenda: 'amber', ver_tabela: 'amber', ver_pacientes: 'amber', ver_vacinas: 'amber', ver_configuracoes: 'amber',
    excluir_agendamento: 'red', excluir_paciente: 'red',
    excluir_produto: 'red', excluir_lote: 'red', excluir_movimentacao: 'red',
    criar_editar_usuarios: 'slate', criar_editar_grupos: 'slate', backup: 'slate', alterar_propria_senha: 'slate',
};

const _COLOR_PILL = {
    blue:    'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    violet:  'bg-violet-50 text-violet-700 border-violet-200',
    orange:  'bg-orange-50 text-orange-700 border-orange-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    red:     'bg-red-50 text-red-700 border-red-200',
    slate:   'bg-slate-100 text-slate-600 border-slate-200',
};

function renderGroupsList() {
    const el = document.getElementById('groups-list');
    const badge = document.getElementById('groups-count-badge');
    if (!el) return;
    if (badge) badge.textContent = appGroups.length + (appGroups.length === 1 ? ' grupo' : ' grupos');
    if (appGroups.length === 0) {
        el.innerHTML = `<div class="flex flex-col items-center justify-center py-16 text-center">
            <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <i class="fas fa-layer-group text-slate-300 text-2xl"></i>
            </div>
            <p class="text-sm font-black text-slate-400 uppercase tracking-wider">Nenhum grupo</p>
            <p class="text-xs text-slate-300 mt-1">Crie um grupo no painel ao lado</p>
        </div>`;
        return;
    }
    const canEditGroups = isCurrentUserAdmin() || hasPerm('criar_editar_grupos');
    el.innerHTML = appGroups.map(g => {
        const usersCount = appUsers.filter(u => u.grupoId == g.id).length;
        const perms = g.permissions || [];
        const permsHtml = perms.length
            ? perms.map(p => {
                const color = _COLOR_PILL[_CAT_COLORS[p] || 'slate'];
                return `<span class="inline-flex items-center gap-1 px-2 py-0.5 border ${color} text-[9px] font-black rounded-full">${PERM_LABELS[p] || p}</span>`;
              }).join('')
            : '<span class="text-[10px] text-slate-300 italic font-medium">Nenhuma permissão atribuída</span>';
        const initials = g.nome.split(' ').slice(0,2).map(w => w[0]).join('');
        return `<div class="group bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 flex items-center justify-center shrink-0 shadow-sm">
                        <span class="text-white font-black text-xs">${initials}</span>
                    </div>
                    <div class="min-w-0">
                        <h5 class="font-black text-navy-900 text-sm truncate">${g.nome}</h5>
                        <p class="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <i class="fas fa-user text-[9px]"></i>
                            ${usersCount} usuário${usersCount !== 1 ? 's' : ''}
                            <span class="mx-1 text-slate-200">·</span>
                            <span class="${perms.length ? 'text-clinic-600' : 'text-slate-300'}">${perms.length} permiss${perms.length !== 1 ? 'ões' : 'ão'}</span>
                        </p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <div class="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        ${canEditGroups ? `<button onclick="editGroup(${g.id})" class="h-8 w-8 bg-slate-100 text-slate-500 hover:bg-blue-500 hover:text-white rounded-xl transition text-xs flex items-center justify-center shadow-sm" title="Editar grupo"><i class="fas fa-pen text-[10px]"></i></button>` : ''}
                        ${canEditGroups && usersCount === 0 ? `<button onclick="deleteGroup(${g.id})" class="h-8 w-8 bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white rounded-xl transition text-xs flex items-center justify-center shadow-sm" title="Excluir grupo"><i class="fas fa-trash text-[10px]"></i></button>` : ''}
                    </div>
                    <button onclick="toggleGroupPerms(this)" class="h-8 w-8 bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-xl transition text-xs flex items-center justify-center" title="Mostrar/ocultar permissões">
                        <i class="fas fa-chevron-down text-[10px]"></i>
                    </button>
                </div>
            </div>
            <div class="group-perms-panel hidden mt-3 pt-3 border-t border-slate-100">
                ${perms.length ? `<div class="flex flex-wrap gap-1">${permsHtml}</div>` : '<span class="text-[10px] text-slate-300 italic font-medium">Nenhuma permissão atribuída</span>'}
            </div>
        </div>`;
    }).join('');
}

function toggleGroupPerms(btn) {
    const card = btn.closest('.group');
    const panel = card.querySelector('.group-perms-panel');
    const icon = btn.querySelector('i');
    const isHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !isHidden);
    icon.style.transform = isHidden ? 'rotate(180deg)' : '';
}

function grupoToggleCat(btn) {
    const block = btn.closest('.perm-cat-block');
    const body = block.querySelector('.perm-cat-body');
    const chevron = btn.querySelector('.perm-cat-chevron');
    const isOpen = !body.classList.contains('hidden');
    body.classList.toggle('hidden', isOpen);
    chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
}

function grupoToggleAllCats() {
    const container = document.getElementById('perm-categories-container');
    if (!container) return;
    const bodies = container.querySelectorAll('.perm-cat-body');
    const anyOpen = [...bodies].some(b => !b.classList.contains('hidden'));
    bodies.forEach(b => b.classList.toggle('hidden', anyOpen));
    container.querySelectorAll('.perm-cat-chevron').forEach(c => {
        c.style.transform = anyOpen ? '' : 'rotate(180deg)';
    });
    const btn = container.closest('.xl\\:col-span-2, div')?.querySelector?.('button[onclick="grupoToggleAllCats()"]')
        || document.querySelector('button[onclick="grupoToggleAllCats()"]');
    if (btn) btn.textContent = anyOpen ? 'Expandir tudo' : 'Recolher tudo';
}

function grupoUpdateCatBadges() {
    document.querySelectorAll('.perm-cat-block').forEach(block => {
        const count = block.querySelectorAll('.perm-check:checked').length;
        const badge = block.querySelector('.perm-cat-badge');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    });
    grupoSyncToggleVisuals();
}

function grupoSyncToggleVisuals() {
    document.querySelectorAll('#perm-categories-container .perm-label-row, #sub-perm-dash-financeiro .perm-label-row').forEach(row => {
        const chk = row.querySelector('.perm-check');
        if (chk) row.classList.toggle('is-checked', chk.checked);
    });
}

function resetGroupForm() {
    document.getElementById('new-group-form').reset();
    document.getElementById('edit-group-id').value = '';
    document.getElementById('grupo-form-title').textContent = 'Novo Grupo';
    const icon = document.getElementById('grupo-form-icon');
    if (icon) { icon.className = 'fas fa-plus text-clinic-600 text-xs'; }
    document.querySelectorAll('.perm-check').forEach(c => c.checked = false);
    _syncSubPerms();
    grupoUpdateCatBadges();
}

function toggleSubPerm(subId, parentChk) {
    const sub = document.getElementById(subId);
    if (!sub) return;
    if (parentChk.checked) {
        sub.classList.remove('hidden');
    } else {
        sub.classList.add('hidden');
        sub.querySelectorAll('.perm-check').forEach(c => c.checked = false);
    }
}

function _syncSubPerms() {
    const dashChk = document.querySelector('.perm-check[value="ver_dashboard"]');
    if (dashChk) toggleSubPerm('sub-perm-dash-financeiro', dashChk);
}

function editGroup(id) {
    const g = appGroups.find(x => x.id == id);
    if (!g) return;
    document.getElementById('edit-group-id').value = g.id;
    document.getElementById('new-group-nome').value = g.nome;
    document.getElementById('grupo-form-title').textContent = 'Editar Grupo';
    const icon = document.getElementById('grupo-form-icon');
    if (icon) { icon.className = 'fas fa-pen text-clinic-600 text-xs'; }
    document.querySelectorAll('.perm-check').forEach(c => { c.checked = (g.permissions || []).includes(c.value); });
    _syncSubPerms();
    grupoUpdateCatBadges();
    // Auto-expand categories that have active permissions
    document.querySelectorAll('.perm-cat-block').forEach(block => {
        const hasActive = block.querySelectorAll('.perm-check:checked').length > 0;
        if (hasActive) {
            block.querySelector('.perm-cat-body')?.classList.remove('hidden');
            const chevron = block.querySelector('.perm-cat-chevron');
            if (chevron) chevron.style.transform = 'rotate(180deg)';
        }
    });
    document.getElementById('new-group-nome').focus();
}

function saveGroup(e) {
    e.preventDefault();
    if (!isCurrentUserAdmin() && !hasPerm('criar_editar_grupos')) {
        showNotification('Acesso negado: você não tem permissão para criar ou editar grupos.', 'error');
        return;
    }
    const id          = document.getElementById('edit-group-id').value;
    const nome        = document.getElementById('new-group-nome').value.trim().toUpperCase();
    const permissions = [...document.querySelectorAll('.perm-check:checked')].map(c => c.value);

    if (id) {
        const idx = appGroups.findIndex(g => String(g.id) === String(id));
        if (idx > -1) {
            const oldGroup = {...appGroups[idx]};
            const oldPermsStr = (oldGroup.permissions || []).slice().sort().join(', ') || '—';
            appGroups[idx].nome = nome; appGroups[idx].permissions = permissions;
            const newPermsStr = permissions.slice().sort().join(', ') || '—';
            const grpChanges = computeChanges({nome: oldGroup.nome, permissoes: oldPermsStr}, {nome, permissoes: newPermsStr}, {nome:'Nome', permissoes:'Permissões'});
            logAudit('Editado', 'grupo', id, nome, null, grpChanges);
        }
    } else {
        const newGid = Date.now();
        appGroups.push({ id: newGid, nome, permissions });
        logAudit('Criado', 'grupo', newGid, nome, `${permissions.length} permissão(ões)`);
    }
    saveUsersData();
    renderGroupsList();
    populateGroupSelect();
    resetGroupForm();
    showNotification('Grupo salvo com sucesso!', 'success');
}

function deleteGroup(id) {
    const inUse = appUsers.some(u => u.grupoId == id);
    if (inUse) { showNotification('Não é possível excluir: grupo possui usuários vinculados.', 'error'); return; }
    showConfirmDanger('Excluir este grupo definitivamente?', () => {
        appGroups = appGroups.filter(g => String(g.id) !== String(id));
        saveUsersData();
        renderGroupsList();
        showNotification('Grupo excluído.', 'success');
    });
}
