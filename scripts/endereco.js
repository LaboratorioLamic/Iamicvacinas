// ─── ENDEREÇO DO AGENDAMENTO ─────────────────────────────────────────────────
// Três preenchimentos independentes sobre os mesmos 6 campos-alvo:
//   1. API ViaCEP  2. histórico do próprio paciente  3. digitação manual
// Nenhum deles destrói input humano já existente.

const ENDERECO_CAMPOS = ['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado', 'referencia'];
const ENDERECO_HIERARQUIA = ['estado', 'cidade', 'bairro', 'logradouro'];

// Padrão aplicado quando não há dado do paciente nem retorno do CEP.
const ENDERECO_PADRAO = { cidade: 'JUAZEIRO DO NORTE', estado: 'CE' };

const ESTADOS_BR = [
    { uf: 'AC', nome: 'Acre' }, { uf: 'AL', nome: 'Alagoas' }, { uf: 'AP', nome: 'Amapá' },
    { uf: 'AM', nome: 'Amazonas' }, { uf: 'BA', nome: 'Bahia' }, { uf: 'CE', nome: 'Ceará' },
    { uf: 'DF', nome: 'Distrito Federal' }, { uf: 'ES', nome: 'Espírito Santo' }, { uf: 'GO', nome: 'Goiás' },
    { uf: 'MA', nome: 'Maranhão' }, { uf: 'MT', nome: 'Mato Grosso' }, { uf: 'MS', nome: 'Mato Grosso do Sul' },
    { uf: 'MG', nome: 'Minas Gerais' }, { uf: 'PA', nome: 'Pará' }, { uf: 'PB', nome: 'Paraíba' },
    { uf: 'PR', nome: 'Paraná' }, { uf: 'PE', nome: 'Pernambuco' }, { uf: 'PI', nome: 'Piauí' },
    { uf: 'RJ', nome: 'Rio de Janeiro' }, { uf: 'RN', nome: 'Rio Grande do Norte' }, { uf: 'RS', nome: 'Rio Grande do Sul' },
    { uf: 'RO', nome: 'Rondônia' }, { uf: 'RR', nome: 'Roraima' }, { uf: 'SC', nome: 'Santa Catarina' },
    { uf: 'SP', nome: 'São Paulo' }, { uf: 'SE', nome: 'Sergipe' }, { uf: 'TO', nome: 'Tocantins' }
];

function _endEl(campo) { return document.getElementById('reg-' + campo); }

// ─── MÁSCARA / BUSCA POR CEP ─────────────────────────────────────────────────

function formatCep(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
    input.value = v;
}

async function buscarCep() {
    const cepEl = _endEl('cep');
    if (!cepEl) return;
    const cep = cepEl.value.replace(/\D/g, '');
    // Guard silencioso: campo parcial não é erro do usuário, só ainda não terminou.
    if (cep.length !== 8) return;

    const alvos = ENDERECO_CAMPOS.map(_endEl).filter(Boolean);
    alvos.forEach(el => el.classList.add('opacity-60'));
    try {
        const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await resp.json();
        // ViaCEP devolve 200 mesmo para CEP inexistente — o erro vem no corpo.
        if (data.erro) { showNotification('CEP não encontrado.', 'error'); return; }

        const logradouroEl = _endEl('logradouro');
        const bairroEl     = _endEl('bairro');
        const cidadeEl     = _endEl('cidade');
        const estadoEl     = _endEl('estado');
        // `|| valor atual` preserva digitação quando o CEP é de cidade inteira.
        if (logradouroEl) logradouroEl.value = (data.logradouro || logradouroEl.value || '').toUpperCase();
        if (bairroEl)     bairroEl.value     = (data.bairro || bairroEl.value || '').toUpperCase();
        if (cidadeEl)     cidadeEl.value     = (data.localidade || cidadeEl.value || '').toUpperCase();
        if (estadoEl)     estadoEl.value     = data.uf || estadoEl.value || '';

        // Cursor pousa no próximo campo que ainda precisa de humano.
        const numeroEl = _endEl('numero');
        if (data.logradouro) { if (numeroEl) numeroEl.focus(); }
        else if (logradouroEl) logradouroEl.focus();
    } catch (err) {
        showNotification('Não foi possível consultar o CEP. Verifique sua conexão.', 'error');
    } finally {
        alvos.forEach(el => el.classList.remove('opacity-60'));
    }
}

// ─── HISTÓRICO DO PACIENTE ───────────────────────────────────────────────────
// Só endereços já usados pelo próprio paciente. Nunca de outros pacientes.

function _enderecosDoPaciente(patId) {
    if (!patId || typeof appointments === 'undefined') return [];
    return appointments
        .filter(a => String(a.patientId) === String(patId) && a.endereco &&
                     ENDERECO_CAMPOS.some(c => a.endereco[c]))
        .map(a => a.endereco);
}

// Assinatura de um endereço, para contar frequência ignorando acento/caixa.
// Ponto de referência fica de fora: é texto livre e não distingue um local.
function _endChave(e) {
    return ENDERECO_CAMPOS.filter(c => c !== 'referencia').map(c => normalizeStr(e[c] || '')).join('|');
}

// Endereço usado com mais frequência pelo paciente; empate resolvido pelo mais recente.
function enderecoMaisFrequente(patId) {
    const lista = _enderecosDoPaciente(patId);
    if (!lista.length) return null;
    const grupos = new Map();
    lista.forEach((e, i) => {
        const k = _endChave(e);
        const g = grupos.get(k);
        if (g) { g.count++; g.ultimo = i; }
        else grupos.set(k, { count: 1, ultimo: i, endereco: e });
    });
    let melhor = null;
    grupos.forEach(g => {
        if (!melhor || g.count > melhor.count || (g.count === melhor.count && g.ultimo > melhor.ultimo)) melhor = g;
    });
    return melhor ? { ...melhor.endereco } : null;
}

// Preenche o formulário com o endereço mais usado do paciente, sem sobrescrever
// nada que o usuário já tenha digitado.
function autoFillEnderecoPaciente(patId, forcar) {
    const end = enderecoMaisFrequente(patId);
    if (!end) { aplicarPadraoEndereco(); return false; }
    ENDERECO_CAMPOS.forEach(c => {
        const el = _endEl(c);
        if (!el) return;
        if (forcar || !el.value.trim()) el.value = end[c] || '';
    });
    aplicarPadraoEndereco();
    return true;
}

// Filtros dos níveis acima do campo atual que já estão preenchidos.
// Referência não é um nível da hierarquia, mas é específica de um local — então
// herda a hierarquia inteira como filtro.
function _filtrosHierarquiaAcima(campo) {
    const idx = campo === 'referencia' ? ENDERECO_HIERARQUIA.length : ENDERECO_HIERARQUIA.indexOf(campo);
    if (idx <= 0) return [];
    return ENDERECO_HIERARQUIA.slice(0, idx)
        .map(c => ({ campo: c, valor: (_endEl(c)?.value || '').trim() }))
        .filter(f => f.valor);
}

// Valores distintos do histórico para um campo, respeitando os níveis acima.
function _valoresHistorico(campo, termo) {
    const patId = document.getElementById('hidden-patient-id')?.value;
    if (!patId) return [];
    const filtros = _filtrosHierarquiaAcima(campo);
    const termoNorm = normalizeStr(termo || '');
    const vistos = new Set();
    const out = [];
    _enderecosDoPaciente(patId).forEach(e => {
        const val = (e[campo] || '').trim();
        if (!val) return;
        if (filtros.some(f => normalizeStr(e[f.campo] || '') !== normalizeStr(f.valor))) return;
        if (termoNorm && !normalizeStr(val).includes(termoNorm)) return;
        const k = normalizeStr(val);
        if (vistos.has(k)) return;
        vistos.add(k);
        out.push(val);
    });
    return out.sort((a, b) => a.localeCompare(b, 'pt-BR')).slice(0, 8);
}

// Um registro do histórico que contenha determinado valor no campo — usado para
// completar os níveis acima quando o usuário escolhe um nível específico.
function _registroHistoricoPara(campo, valor) {
    const patId = document.getElementById('hidden-patient-id')?.value;
    if (!patId) return null;
    const alvo = normalizeStr(valor);
    const filtros = _filtrosHierarquiaAcima(campo);
    return _enderecosDoPaciente(patId).find(e =>
        normalizeStr(e[campo] || '') === alvo &&
        !filtros.some(f => normalizeStr(e[f.campo] || '') !== normalizeStr(f.valor))
    ) || null;
}

function _popoverEl(campo) { return document.getElementById('end-sug-' + campo); }

function mostrarSugestoesEndereco(campo) {
    const pop = _popoverEl(campo);
    const el  = _endEl(campo);
    if (!pop || !el) return;
    const opcoes = campo === 'estado' ? _opcoesEstado(el.value) : _valoresHistorico(campo, el.value);
    if (!opcoes.length) { pop.classList.add('hidden'); return; }
    pop.innerHTML = opcoes.map(v => {
        const label = typeof v === 'string' ? v : `${v.uf} — ${v.nome}`;
        const valor = typeof v === 'string' ? v : v.uf;
        return `<div class="px-3 py-2 hover:bg-clinic-50 hover:text-clinic-700 cursor-pointer text-sm font-bold text-navy-900 border-b border-slate-100 last:border-0 transition uppercase"
                     onmousedown="selecionarSugestaoEndereco('${campo}', '${String(valor).replace(/'/g, "\\'")}')">${label}</div>`;
    }).join('');
    pop.classList.remove('hidden');
}

function esconderSugestoesEndereco(campo) {
    setTimeout(() => _popoverEl(campo)?.classList.add('hidden'), 150);
}

// Escolher um nível específico completa os níveis acima que ainda estão vazios.
function selecionarSugestaoEndereco(campo, valor) {
    const el = _endEl(campo);
    if (!el) return;
    el.value = campo === 'estado' ? valor : String(valor).toUpperCase();
    _popoverEl(campo)?.classList.add('hidden');

    const idx = campo === 'referencia' ? ENDERECO_HIERARQUIA.length : ENDERECO_HIERARQUIA.indexOf(campo);
    if (idx > 0) {
        const reg = _registroHistoricoPara(campo, valor);
        if (reg) {
            ENDERECO_HIERARQUIA.slice(0, idx).forEach(c => {
                const acima = _endEl(c);
                if (acima && !acima.value.trim() && reg[c]) acima.value = reg[c];
            });
            // CEP e número não são níveis, mas acompanham o endereço escolhido.
            ['cep', 'numero'].forEach(c => {
                const extra = _endEl(c);
                if (extra && !extra.value.trim() && reg[c]) extra.value = reg[c];
            });
        }
    }
}

// ─── UF ──────────────────────────────────────────────────────────────────────

function _opcoesEstado(termo) {
    const t = normalizeStr(termo || '');
    if (!t) return ESTADOS_BR.slice();
    return ESTADOS_BR.filter(e => normalizeStr(e.uf).includes(t) || normalizeStr(e.nome).includes(t));
}

// Aceita sigla ou nome; grava sempre a sigla. Valor inválido é zerado no blur.
function validarEstadoEndereco() {
    const el = _endEl('estado');
    if (!el) return;
    const v = normalizeStr(el.value);
    if (!v) { el.value = ''; return; }
    const achado = ESTADOS_BR.find(e => normalizeStr(e.uf) === v || normalizeStr(e.nome) === v);
    el.value = achado ? achado.uf : '';
    if (!achado) showNotification('UF inválida. Use a sigla (ex.: RS) ou o nome do estado.', 'error');
}

function onEnderecoInputUpper(input) {
    const pos = input.selectionStart;
    input.value = input.value.toUpperCase();
    input.setSelectionRange(pos, pos);
}

// ─── COLETA / RESET ──────────────────────────────────────────────────────────

function coletarEnderecoForm() {
    const end = {};
    let algum = false;
    ENDERECO_CAMPOS.forEach(c => {
        const v = (_endEl(c)?.value || '').trim();
        end[c] = c === 'cep' ? v : v.toUpperCase();
        if (end[c]) algum = true;
    });
    return algum ? end : null;
}

function preencherEnderecoForm(end) {
    ENDERECO_CAMPOS.forEach(c => {
        const el = _endEl(c);
        if (el) el.value = (end && end[c]) || '';
    });
}

// Endereço para agendamentos criados fora do formulário (grupo de oportunidade,
// descarte). Copia o das vacinas irmãs do grupo; sem elas, o mais usado pelo
// paciente. Nunca fica sem cidade/UF.
function enderecoParaNovoAgendamento(patId, irmaos) {
    const doGrupo = (irmaos || []).map(a => a && a.endereco).find(e => e && (e.logradouro || e.cidade));
    const base = doGrupo || enderecoMaisFrequente(patId);
    const end = {};
    ENDERECO_CAMPOS.forEach(c => { end[c] = (base && base[c]) || ''; });
    if (!end.cidade) end.cidade = ENDERECO_PADRAO.cidade;
    if (!end.estado) end.estado = ENDERECO_PADRAO.estado;
    return end;
}

// Cidade/UF padrão da clínica — só entram onde não há dado, nunca por cima.
function aplicarPadraoEndereco() {
    const cidadeEl = _endEl('cidade');
    const estadoEl = _endEl('estado');
    if (cidadeEl && !cidadeEl.value.trim()) cidadeEl.value = ENDERECO_PADRAO.cidade;
    if (estadoEl && !estadoEl.value.trim()) estadoEl.value = ENDERECO_PADRAO.estado;
}

function limparEnderecoForm() {
    preencherEnderecoForm(null);
    ENDERECO_CAMPOS.forEach(c => _popoverEl(c)?.classList.add('hidden'));
    aplicarPadraoEndereco();
    const box = document.getElementById('reg-mapa-box');
    const frame = document.getElementById('reg-mapa-frame');
    if (box) box.classList.add('hidden');
    if (frame) frame.src = '';
}

// ─── VALIDAÇÃO ───────────────────────────────────────────────────────────────
// Status "Agendado" exige endereço utilizável para a visita. CEP e ponto de
// referência seguem opcionais.
const ENDERECO_OBRIGATORIOS = [
    { campo: 'logradouro', label: 'Logradouro' },
    { campo: 'numero',     label: 'Número' },
    { campo: 'bairro',     label: 'Bairro' },
    { campo: 'cidade',     label: 'Cidade' },
    { campo: 'estado',     label: 'UF' }
];

function validarEnderecoObrigatorio(status) {
    if (status !== 'Agendado') return true;
    const faltando = ENDERECO_OBRIGATORIOS.filter(f => !(_endEl(f.campo)?.value || '').trim());
    if (!faltando.length) return true;
    showNotification(
        `Endereço incompleto: preencha <b>${faltando.map(f => f.label).join(', ')}</b> para o status Agendado.`,
        'error'
    );
    _endEl(faltando[0].campo)?.focus();
    return false;
}

// ─── MAPA (embed gratuito, sem geocoding nem API key) ─────────────────────────

// Ponto de referência fica de fora da query: é texto livre e só atrapalha o
// geocoding do Google.
function _enderecoParaMapaObj(end) {
    if (!end) return '';
    const rua = [end.logradouro, end.numero].filter(Boolean).join(', ');
    return [rua, end.bairro, end.cidade, end.estado, end.cep].filter(Boolean).join(', ');
}

function enderecoParaMapa() {
    return _enderecoParaMapaObj(coletarEnderecoForm());
}

function _mapaUrl(endereco) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(endereco)}&output=embed`;
}

function toggleMapaEndereco() {
    const box   = document.getElementById('reg-mapa-box');
    const frame = document.getElementById('reg-mapa-frame');
    if (!box || !frame) return;
    // Fechar zera o src: mata a request pendente e o tracking do iframe.
    if (!box.classList.contains('hidden')) { box.classList.add('hidden'); frame.src = ''; return; }
    const endereco = enderecoParaMapa();
    if (!endereco) { showNotification('Preencha o endereço para ver no mapa.', 'error'); return; }
    frame.src = _mapaUrl(endereco);
    box.classList.remove('hidden');
}

function _girarChevronMapa(aberto) {
    const chev = document.getElementById('vr-btn-mapa-chevron');
    if (chev) chev.style.transform = aberto ? 'rotate(180deg)' : '';
}

// Mesmo contrato na visualização, porém a partir do objeto salvo.
function toggleMapaEnderecoView() {
    const box   = document.getElementById('vr-mapa-box');
    const frame = document.getElementById('vr-mapa-frame');
    if (!box || !frame) return;
    if (!box.classList.contains('hidden')) { box.classList.add('hidden'); frame.src = ''; _girarChevronMapa(false); return; }
    const a = (typeof appointments !== 'undefined') ? appointments.find(x => x.id == window._vrCurrentId) : null;
    const endereco = _enderecoParaMapaObj(a && a.endereco);
    if (!endereco) { showNotification('Este agendamento não possui endereço.', 'error'); return; }
    frame.src = _mapaUrl(endereco);
    box.classList.remove('hidden');
    _girarChevronMapa(true);
}

// Resumo textual completo (com a referência) — usado no log de auditoria.
function enderecoResumo(end) {
    if (!end) return '';
    const base = _enderecoParaMapaObj(end);
    return end.referencia ? [base, `Ref.: ${end.referencia}`].filter(Boolean).join(' — ') : base;
}

// Partes já formatadas para o card da visualização. Cada linha só aparece se
// tiver conteúdo — endereço parcial não deixa rótulo órfão na tela.
function enderecoPartes(end) {
    if (!end) return null;
    const rua    = [end.logradouro, end.numero].filter(Boolean).join(', ');
    const linha  = [rua, end.bairro].filter(Boolean).join(' · ');
    const cidade = [end.cidade, end.estado].filter(Boolean).join(' / ');
    const cep    = end.cep || '';
    const ref    = end.referencia || '';
    if (!linha && !cidade && !cep && !ref) return null;
    return { linha, cidade, cep, referencia: ref };
}
