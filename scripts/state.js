// ─── GLOBAL STATE VARIABLES (from index.html lines 2018-2020, 2054-2056, 2131-2156) ─

// Data arrays
let patients = [], vaccines = [], appointments = [], cancelReasons = [];
let holidays = [], vaccineLots = [], auditLog = [];
let stockMovements = []; // [{id, loteId, vaccineId, tipo:'entrada'|'saida', qtd, motivo, descarte, data, usuario}]
let currentLoteModalVaccineId = null;

// Almoxarifado state
let almoxModulo = 'estoque'; // estoque | produtos | lotes | movimentacao

// App readiness
let _appReady = false;
let _fbSaveTimer = null;

// Calendar / date state
let currentDate = new Date();

// Chart instances
let chartStatus, chartVaccine, chartLineVaccine, chartFinVaccine, chartFinMonth, chartAge, chartGender;

// Dashboard state
let dashView = 'analitico';

// Table state
let tableSortField = 'data', tableSortDir = 'asc';
let tableView = 'planilhas';

// User filter state
let userStatusFilter = 'ativos';

// Kanban state
let _kanbanSortDir = 'asc';
let _kanbanDragId = null;
let _kanbanPendingCancelId = null;

// Agenda day selection
let selectedDayDate = null;

// Auth state
let appUsers  = [];
let appGroups = [];
localStorage.removeItem('ig_session');
let currentUser = null;

// Audit state
let _auditCtx = { entityType: null, entityId: null, entityName: null };
let _auditFilterMonth = null; // { year, month } ou null
let _auditCalYear = new Date().getFullYear();
let _auditPage = 0;
const _AUDIT_PAGE_SIZE = 10;

// Financial formatting
const fmtBRL = v => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Ranking state
const rankSortState = {};
const rankData      = {};

// Name utilities
const _nameArticles = new Set(['da','do','das','dos','de','du','e']);

// Vaccine schema state (used in vaccine modal)
let _esquemas = []; // [{minAnos, minMeses, maxAnos, maxMeses, numDoses, intervalos}]

// Discount state
let _descontoAtivo = false;   // há desconto aplicado?
let _valorCheio = '';         // valor cheio sem desconto (string mascarada)
let _descontoTab = 'pct';     // aba ativa: 'pct' | 'val'

// Pending action IDs
let pendingDeleteId = null;
let pendingDeletePatientId = null;
let _pendingDeleteUserId = null;
let pendingAgendarId = null;
let pendingConcluirId = null;

// Patient modal state
let _patientModalOpenedFromRecord = false;

// Backup pending data
let pendingBackupData = null;

// Permission labels
const PERM_LABELS = {
    agendar: 'Visualizar Agendamento', criar_agendamento: 'Agendar', aplicar: 'Aplicar', definir_feriados: 'Definir Feriados',
    adicionar_paciente: 'Adicionar Paciente', editar_paciente: 'Editar Paciente',
    leitura_estoque: 'Leitura do Estoque', criar_produtos: 'Criar Produtos',
    edicao_lotes: 'Edição de Lotes', edicao_movimentacao: 'Edição de Movimentação',
    baixar_pdf: 'Baixar PDF',
    ver_dashboard: 'Ver Dashboard', ver_dash_financeiro: 'Painel Financeiro', ver_agenda: 'Ver Agenda', ver_tabela: 'Ver Tabela', ver_pacientes: 'Ver Pacientes', ver_vacinas: 'Ver Vacinas', ver_configuracoes: 'Ver Configurações',
    excluir_agendamento: 'Excluir Agendamento', excluir_paciente: 'Excluir Paciente',
    excluir_produto: 'Excluir Produto', excluir_lote: 'Excluir Lote', excluir_movimentacao: 'Excluir Movimentação',
    criar_editar_usuarios: 'Criar/Editar Usuários', criar_editar_grupos: 'Criar/Editar Grupos',
    backup: 'Função de Backup', alterar_propria_senha: 'Alterar Própria Senha'
};
