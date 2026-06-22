// ─── AUTHENTICATION & PERMISSIONS (from index.html lines ~5789-6134) ─────────

function hashPwd(pwd) {
    let h = 5381;
    for (let i = 0; i < pwd.length; i++) h = Math.imul(h, 33) ^ pwd.charCodeAt(i);
    return (h >>> 0).toString(36);
}

function hasPerm(perm) {
    if (!currentUser) return false;
    const u = appUsers.find(x => x.id == currentUser.id);
    if (!u) return false;
    if (u.isAdmin) return true;
    const g = appGroups.find(x => x.id == u.grupoId);
    return g ? (g.permissions || []).includes(perm) : false;
}

function isCurrentUserAdmin() {
    if (!currentUser) return false;
    const u = appUsers.find(x => x.id == currentUser.id);
    return u ? !!u.isAdmin : false;
}

// Exibe notificação e retorna false se sem permissão; retorna true se ok
function checkPerm(perm) {
    if (isCurrentUserAdmin() || hasPerm(perm)) return true;
    showNotification('Acesso negado: você não tem permissão para esta ação.', 'error');
    return false;
}

// Retorna html se o usuário tem a permissão, senão string vazia
function permBtn(perm, html) {
    return (isCurrentUserAdmin() || hasPerm(perm)) ? html : '';
}

function initAuth() {
    const adminExists = appUsers.some(u => u.isAdmin);
    const screen = document.getElementById('login-screen');

    if (!adminExists) {
        document.getElementById('login-card').classList.add('hidden');
        document.getElementById('first-admin-card').classList.remove('hidden');
        screen.style.display = 'flex';
        return;
    }

    // Valida sessão existente
    if (currentUser) {
        const u = appUsers.find(x => x.id == currentUser.id && x.login === currentUser.login);
        if (u) { screen.style.display = 'none'; updateUserUI(); return; }
    }

    document.getElementById('login-card').classList.remove('hidden');
    document.getElementById('first-admin-card').classList.add('hidden');
    screen.style.display = 'flex';
}

function toggleLoginPwd() {
    const inp = document.getElementById('senha-input');
    const eye = document.getElementById('login-eye');
    if (inp.type === 'password') { inp.type = 'text'; eye.className = 'fas fa-eye-slash text-sm'; }
    else { inp.type = 'password'; eye.className = 'fas fa-eye text-sm'; }
}

function createFirstAdmin(e) {
    e.preventDefault();
    const nome   = document.getElementById('admin-nome').value.trim().toUpperCase();
    const cpf    = document.getElementById('admin-cpf').value.trim();
    const login  = document.getElementById('admin-login').value.trim();
    const senha  = document.getElementById('admin-senha').value;
    const senha2 = document.getElementById('admin-senha2').value;
    const errEl  = document.getElementById('admin-error');
    const msgEl  = document.getElementById('admin-error-msg');
    errEl.classList.add('hidden');

    if (!/^[a-z0-9]+$/.test(login)) { msgEl.textContent = 'O login deve conter apenas letras minúsculas e números, sem espaços ou caracteres especiais.'; errEl.classList.remove('hidden'); return; }
    if (senha !== senha2) { msgEl.textContent = 'As senhas não conferem.'; errEl.classList.remove('hidden'); return; }
    if (senha.length < 6) { msgEl.textContent = 'A senha deve ter ao menos 6 caracteres.'; errEl.classList.remove('hidden'); return; }

    const admin = { id: Date.now(), nome, cpf, login, senhaHash: hashPwd(senha), grupoId: null, isAdmin: true };
    appUsers.push(admin);
    saveUsersData();
    currentUser = { id: admin.id, login: admin.login, nome: admin.nome };
    localStorage.setItem('ig_session', JSON.stringify(currentUser));
    document.getElementById('login-screen').style.display = 'none';
    updateUserUI();
    showNotification(`Bem-vindo, ${admin.nome.split(' ')[0]}!`, 'success');
}

function doLogin(e) {
    e.preventDefault();
    const login  = document.getElementById('login-input').value.trim();
    const senha  = document.getElementById('senha-input').value;
    const errEl  = document.getElementById('login-error');
    const msgEl  = document.getElementById('login-error-msg');
    errEl.classList.add('hidden');

    if (!/^[a-z0-9]+$/.test(login)) { msgEl.textContent = 'Login inválido: use apenas letras minúsculas e números.'; errEl.classList.remove('hidden'); return; }
    const user = appUsers.find(u => u.login === login && u.senhaHash === hashPwd(senha));
    if (!user) { msgEl.textContent = 'Login ou senha incorretos.'; errEl.classList.remove('hidden'); return; }
    if (user.ativo === false) { msgEl.textContent = 'Usuário inativo. Contate o administrador.'; errEl.classList.remove('hidden'); return; }

    currentUser = { id: user.id, login: user.login, nome: user.nome };
    localStorage.setItem('ig_session', JSON.stringify(currentUser));
    document.getElementById('login-screen').style.display = 'none';
    updateUserUI();
    const firstTab = getFirstAllowedTab();
    if (firstTab) switchTab(firstTab);
    showNotification(`Bem-vindo, ${user.nome.split(' ')[0]}!`, 'success');
}

function doLogout() {
    currentUser = null;
    localStorage.removeItem('ig_session');
    document.getElementById('login-input').value = '';
    document.getElementById('senha-input').value = '';
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('login-screen').style.display = 'flex';
}

function getFirstAllowedTab() {
    const admin = isCurrentUserAdmin();
    const order = [
        { tab: 'dashboard', perm: 'ver_dashboard' },
        { tab: 'agenda',    perm: 'ver_agenda'    },
        { tab: 'dados',     perm: 'ver_tabela'    },
        { tab: 'pacientes', perm: 'ver_pacientes' },
        { tab: 'vacinas',   perm: 'ver_vacinas'   },
    ];
    for (const { tab, perm } of order) {
        if (admin || hasPerm(perm)) return tab;
    }
    return null;
}

function applyPermissions() {
    if (!currentUser) return;

    // Sempre oculta o aviso de acesso restrito ao re-aplicar permissões
    const avisoExistente = document.getElementById('aviso-sem-permissao');
    if (avisoExistente) avisoExistente.classList.add('hidden');

    const admin      = isCurrentUserAdmin();
    const canDash    = admin || hasPerm('ver_dashboard');
    const canFinanc  = admin || hasPerm('ver_dash_financeiro');
    const canAgenda  = admin || hasPerm('ver_agenda');
    const canTabela  = admin || hasPerm('ver_tabela');
    const canPacTab  = admin || hasPerm('ver_pacientes');
    const canVacTab  = admin || hasPerm('ver_vacinas');
    const canCfg     = admin || hasPerm('ver_configuracoes');
    const canAgendar = admin || hasPerm('criar_agendamento');
    const canPac     = admin || hasPerm('adicionar_paciente');
    const canVac     = admin || hasPerm('vacinas_crud');
    const canPdf     = admin || hasPerm('baixar_pdf');

    // Tabs — oculta botões sem permissão
    const tabVisibility = {
        'btn-dashboard': canDash,
        'btn-agenda':    canAgenda,
        'btn-dados':     canTabela,
        'btn-pacientes': canPacTab,
        'btn-vacinas':   canVacTab,
    };
    for (const [id, can] of Object.entries(tabVisibility)) {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = can ? '' : 'none';
    }

    // Botão Financeiro no dashboard
    const btnFinanceiro = document.getElementById('dash-tab-btn-financeiro');
    if (btnFinanceiro) {
        btnFinanceiro.style.display = canFinanc ? '' : 'none';
        if (!canFinanc && dashView === 'financeiro') switchDashView('analitico');
    }

    // Redireciona se a aba atual não é permitida
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
        const activeId = activeTab.id.replace('tab-', '');
        const tabPerms = { dashboard: canDash, agenda: canAgenda, dados: canTabela, pacientes: canPacTab, vacinas: canVacTab };
        if (tabPerms[activeId] === false) {
            const next = getFirstAllowedTab();
            if (next) {
                switchTab(next);
            } else {
                // Nenhuma aba disponível — oculta conteúdo e mostra aviso
                document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
                let aviso = document.getElementById('aviso-sem-permissao');
                if (!aviso) {
                    aviso = document.createElement('div');
                    aviso.id = 'aviso-sem-permissao';
                    aviso.className = 'flex flex-col items-center justify-center h-full py-32 gap-4 text-center';
                    aviso.innerHTML = `
                        <div class="bg-red-50 border border-red-200 rounded-2xl px-10 py-8 max-w-md">
                            <i class="fas fa-lock text-4xl text-red-400 mb-4"></i>
                            <p class="text-base font-black text-red-700 mb-1">Acesso restrito</p>
                            <p class="text-sm text-red-500">Você não tem permissão para acessar nenhuma aba. Entre em contato com um administrador.</p>
                        </div>`;
                    document.querySelector('main') && document.querySelector('main').appendChild(aviso);
                }
                aviso.classList.remove('hidden');
            }
        } else {
            const aviso = document.getElementById('aviso-sem-permissao');
            if (aviso) aviso.classList.add('hidden');
        }
    }

    // Engrenagem de configurações
    const gearBtn = document.getElementById('btn-settings');
    if (gearBtn) gearBtn.style.display = canCfg ? '' : 'none';

    // Botões de ação nos cabeçalhos de seção
    const el = (id) => document.getElementById(id);
    if (el('btn-agendar-agenda')) el('btn-agendar-agenda').style.display = canAgendar ? '' : 'none';
    if (el('btn-novo-tabela'))    el('btn-novo-tabela').style.display    = canAgendar ? '' : 'none';
    if (el('btn-view-kanban'))    el('btn-view-kanban').style.display    = canAgendar ? '' : 'none';
    if (el('btn-novo-paciente'))  el('btn-novo-paciente').style.display  = canPac     ? '' : 'none';
    if (el('btn-nova-vacina'))    el('btn-nova-vacina').style.display    = canVac     ? '' : 'none';
    if (el('btn-pdf-prontuario')) el('btn-pdf-prontuario').style.display = canPdf     ? '' : 'none';

    // Botão "Agendar neste dia" no modal do dia
    const btnDia = el('btn-agendar-dia');
    if (btnDia && !btnDia.dataset.holidayHidden) {
        btnDia.style.display = canAgendar ? '' : 'none';
    }

    // Re-renderiza listas para reflectir permissões nos botões dinâmicos
    renderVaccines();
    renderPatients();
    renderTable();
}

function updateUserUI() {
    const el = document.getElementById('header-user-info');
    if (el && currentUser) el.textContent = currentUser.nome.split(' ')[0];
    applyPermissions();
}

// ─── MEU PERFIL ───────────────────────────────────────────────────────────────
function openMeuPerfil() {
    if (!currentUser) return;
    const u = appUsers.find(x => x.id == currentUser.id);
    if (!u) return;
    const canEdit = isCurrentUserAdmin() || hasPerm('criar_editar_usuarios');
    const grupo = appGroups.find(g => g.id == u.grupoId);
    const { initials } = getDisplayName(u.nome);

    document.getElementById('perfil-avatar').textContent = initials;
    document.getElementById('perfil-role-badge').textContent = u.isAdmin ? 'Administrador Geral' : (grupo ? grupo.nome : 'Sem grupo');
    document.getElementById('perfil-grupo').value = u.isAdmin ? 'Administrador Geral' : (grupo ? grupo.nome : '—');

    const nomeEl  = document.getElementById('perfil-nome');
    const cpfEl   = document.getElementById('perfil-cpf');
    const loginEl = document.getElementById('perfil-login');
    nomeEl.value  = u.nome;
    cpfEl.value   = u.cpf || '';
    loginEl.value = u.login;

    [nomeEl, cpfEl, loginEl].forEach(el => {
        el.readOnly = !canEdit;
        el.classList.remove('bg-white','bg-slate-100','text-slate-700','text-slate-500','cursor-default');
        if (canEdit) { el.classList.add('bg-white','text-slate-700'); }
        else { el.classList.add('bg-slate-100','text-slate-500','cursor-default'); }
    });

    document.getElementById('perfil-senha-atual').value = '';
    document.getElementById('perfil-senha-nova').value = '';
    document.getElementById('perfil-senha-nova2').value = '';
    document.getElementById('perfil-aviso').classList.add('hidden');

    const podeTrocarSenha = u.isAdmin || hasPerm('alterar_propria_senha');
    document.getElementById('perfil-secao-senha').classList.toggle('hidden', !podeTrocarSenha);

    const podeSalvar = u.isAdmin || hasPerm('criar_editar_usuarios') || hasPerm('alterar_propria_senha');
    document.getElementById('perfil-btn-salvar').classList.toggle('hidden', !podeSalvar);

    document.getElementById('modal-meu-perfil').classList.add('active');
}

function salvarMeuPerfil() {
    const u = appUsers.find(x => x.id == currentUser.id);
    if (!u) return;
    const canEdit = isCurrentUserAdmin() || hasPerm('criar_editar_usuarios');
    const avisoEl = document.getElementById('perfil-aviso');

    function showAviso(msg, tipo) {
        avisoEl.className = `flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] font-black ${tipo === 'erro' ? 'bg-red-50 border border-red-300 text-red-600' : 'bg-green-50 border border-green-300 text-green-700'}`;
        avisoEl.innerHTML = `<i class="fas ${tipo === 'erro' ? 'fa-exclamation-circle' : 'fa-check-circle'} mt-0.5 shrink-0"></i><span>${msg}</span>`;
        avisoEl.classList.remove('hidden');
        setTimeout(() => avisoEl.classList.add('hidden'), 4000);
    }

    const senhaAtual = document.getElementById('perfil-senha-atual').value;
    const senhaNova  = document.getElementById('perfil-senha-nova').value;
    const senhaNova2 = document.getElementById('perfil-senha-nova2').value;
    let alterou = false;

    if (canEdit) {
        const novoNome  = document.getElementById('perfil-nome').value.trim().toUpperCase();
        const novoCpf   = document.getElementById('perfil-cpf').value.trim();
        const novoLogin = document.getElementById('perfil-login').value.trim();
        if (!novoNome || !novoLogin) { showAviso('Nome e login são obrigatórios.', 'erro'); return; }
        if (!/^[a-z0-9]+$/.test(novoLogin)) { showAviso('Login inválido: use apenas letras minúsculas e números.', 'erro'); return; }
        const loginDup = appUsers.find(x => x.login === novoLogin && x.id != u.id);
        if (loginDup) { showAviso('Este login já está em uso por outro usuário.', 'erro'); return; }
        const oldFlat = {nome: u.nome, cpf: u.cpf || '', login: u.login};
        u.nome = novoNome; u.cpf = novoCpf; u.login = novoLogin;
        const changes = computeChanges(oldFlat, {nome: u.nome, cpf: u.cpf, login: u.login}, {nome:'Nome', cpf:'CPF', login:'Login'});
        if (changes.length) { logAudit('Editado', 'usuario', u.id, u.nome, null, changes); alterou = true; }
        if (currentUser.id == u.id) {
            currentUser.nome = u.nome; currentUser.login = u.login;
            localStorage.setItem('ig_session', JSON.stringify(currentUser));
            updateUserUI();
        }
    }

    if (senhaNova || senhaAtual) {
        if (!senhaAtual) { showAviso('Informe a senha atual para alterá-la.', 'erro'); return; }
        if (hashPwd(senhaAtual) !== u.senhaHash) { showAviso('Senha atual incorreta.', 'erro'); return; }
        if (!senhaNova || senhaNova.length < 6) { showAviso('A nova senha deve ter ao menos 6 caracteres.', 'erro'); return; }
        if (senhaNova !== senhaNova2) { showAviso('As novas senhas não conferem.', 'erro'); return; }
        u.senhaHash = hashPwd(senhaNova);
        logAudit('Editado', 'usuario', u.id, u.nome, 'Senha alterada pelo próprio usuário');
        alterou = true;
    }

    if (!alterou) { showAviso('Nenhuma alteração detectada.', 'erro'); return; }
    saveUsersData();
    showNotification('Perfil atualizado com sucesso!', 'success');
    document.getElementById('perfil-senha-atual').value = '';
    document.getElementById('perfil-senha-nova').value = '';
    document.getElementById('perfil-senha-nova2').value = '';
    document.getElementById('modal-meu-perfil').classList.remove('active');
}
