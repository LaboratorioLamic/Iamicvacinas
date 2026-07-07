# Graph Report - .  (2026-07-07)

## Corpus Check
- 21 files · ~79,226 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 683 nodes · 1249 edges · 30 communities (27 shown, 3 thin omitted)
- Extraction: 93% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.77)
- Token cost: 90,000 input · 18,000 output

## Community Hubs (Navigation)
- Oportunidades (Vaccine Opportunities)
- Appointments Modal & Records
- UI Shell & Dashboard Popovers
- Vaccines & Lote Management
- Agenda Table View
- Almoxarifado (Inventory) Core
- Contatos (Patient Contacts)
- Agenda Kanban Drag-Drop
- Users & Groups Admin
- Global App State
- Pacientes (Patients) CRUD
- Agenda Kanban Rendering & Filters
- Agenda Calendar & Weekly Views
- Auth & Login
- Almoxarifado Movimentação Filters
- Utils (Formatting & Masks)
- Audit Log
- Dashboard Analytics
- Agenda Group Scheduling (Aplicar)
- Almoxarifado Vaccine View Modal
- Almoxarifado Movement Modal
- Agenda Vendedor Popover (Calendar)
- Config & Firebase Settings
- Agenda Month/Year Picker
- Almoxarifado Lote Stock Queries
- Firebase Sync
- Backup
- Agenda Group Scheduling Modals
- App Topbar

## God Nodes (most connected - your core abstractions)
1. `renderCalendar()` - 21 edges
2. `renderOportunidades()` - 19 edges
3. `getLoteEstoque()` - 16 edges
4. `renderTable()` - 14 edges
5. `renderKanban()` - 13 edges
6. `renderWeekly()` - 12 edges
7. `autoFillPatient()` - 12 edges
8. `renderEstoqueDashboard()` - 11 edges
9. `autoFillVaccine()` - 11 edges
10. `renderAlmoxLotes()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `toggleMonthYearPicker()` --indirect_call--> `_closPickerOutside()`  [INFERRED]
  scripts/agenda.js → scripts/agenda.js  _Bridges community 23 → community 12_
- `renderCalendar()` --calls--> `_populateCalVendedorList()`  [EXTRACTED]
  scripts/agenda.js → scripts/agenda.js  _Bridges community 21 → community 12_
- `getFilterWeekStart()` --calls--> `_getSundayOf()`  [EXTRACTED]
  scripts/agenda.js → scripts/agenda.js  _Bridges community 12 → community 11_
- `_handleGroupDrop()` --calls--> `renderCalendar()`  [EXTRACTED]
  scripts/agenda.js → scripts/agenda.js  _Bridges community 12 → community 18_
- `kanbanDrop()` --calls--> `renderCalendar()`  [EXTRACTED]
  scripts/agenda.js → scripts/agenda.js  _Bridges community 12 → community 27_

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agenda Module: Calendar, Table/Kanban, and Opportunities Views** — index_tab_agenda, index_agendaview_agenda, index_agendaview_tabela, index_agendaview_oportunidades, scripts_agenda, scripts_tabela, scripts_oportunidades [INFERRED 0.85]
- **Almoxarifado Module: Stock, Products, Batches, and Movement** — index_tab_vacinas, index_alm_modulo_estoque, index_alm_modulo_produtos, index_alm_modulo_lotes, index_alm_modulo_movimentacao, scripts_almoxarifado, scripts_vacinas [INFERRED 0.85]
- **Settings Modal: Users and Backup administration** — index_modal_settings, index_settings_content_usuarios, index_settings_content_backup, scripts_users, scripts_backup [INFERRED 0.80]

## Communities (30 total, 3 thin omitted)

### Community 0 - "Oportunidades (Vaccine Opportunities)"
Cohesion: 0.06
Nodes (76): View Oportunidades, Modal Agendar em Grupo, Modal Aplicar em Grupo, Modal Descartar Oportunidade, Modal Grupo Perdido, Grid de Cards de Oportunidades, Filtros Oportunidades - Aprazamento, Filtros Oportunidades - Oferta (+68 more)

### Community 1 - "Appointments Modal & Records"
Cohesion: 0.06
Nodes (54): Botão Flutuante Novo Agendamento, Modal Aviso de Idade, Modal Agendar, Modal Aviso de Aprazamento, Modal Motivos de Cancelamento, Modal Concluir Agendamento, Modal Desconto, Modal Aviso Dose Anterior (+46 more)

### Community 2 - "UI Shell & Dashboard Popovers"
Cohesion: 0.07
Nodes (39): Modal Confirmação de Exclusão, Modal Confirmação Genérica de Exclusão, _applyDarkModeInlineColors(), closeDangerConfirm(), closeDashPops(), closeDuplicatePatientModal(), _commitDashRange(), _dashKeyToNum() (+31 more)

### Community 3 - "Vaccines & Lote Management"
Cohesion: 0.07
Nodes (41): Módulo Almoxarifado: Produtos, Modal Faixa Etária, Modal Cadastro/Edição de Vacina, Modal Visualizar Vacina, addEsquemaVacinal(), addLote(), _buildLoteEventos(), checkDlaConfirm() (+33 more)

### Community 4 - "Agenda Table View"
Cohesion: 0.11
Nodes (41): View Planilha + Kanban, Kanban de Agendamentos, Tabela de Agendamentos (Planilha), _applyVendedorPopoverSearch(), _buildStatusFilterOptions(), changeFilterDay(), changeFilterMonth(), _closeAllFilterPops() (+33 more)

### Community 5 - "Almoxarifado (Inventory) Core"
Cohesion: 0.06
Nodes (31): Módulo Almoxarifado: Estoque, Módulo Almoxarifado: Lotes, Módulo Almoxarifado: Movimentação, Sidebar de Módulos do Almoxarifado, Modal Adicionar Lote (FAB), Modal Excluir Lote com Agendamentos, Modal Excluir Movimentação, Modal Editar Lote (+23 more)

### Community 6 - "Contatos (Patient Contacts)"
Cohesion: 0.12
Nodes (35): Painel Flutuante de Contatos Agendados, Modal Concluir Contato, Modal Excluir Contato, Modal Editar Contato, _canDeleteContact(), _canEditContact(), closeConcluirContatoModal(), closeEditarContatoModal() (+27 more)

### Community 7 - "Agenda Kanban Drag-Drop"
Cohesion: 0.06
Nodes (17): View Agenda (Calendário), Modal Detalhes do Dia, Modal Drop Semanal (Agenda), Aba Agenda, cancelRemoveAgendarGrupoLine(), _checkAgendarGrupoBtn(), executeRemoveAgendarGrupoLine(), _filterAplicadorDropdown() (+9 more)

### Community 8 - "Users & Groups Admin"
Cohesion: 0.09
Nodes (28): Modal Excluir Usuário, Modal Meu Perfil, Aba Configurações: Usuários, Subaba Grupos e Permissões, Subaba Lista de Usuários, Subaba Novo Usuário, _CAT_COLORS, checkDeleteUserConfirm() (+20 more)

### Community 9 - "Global App State"
Cohesion: 0.08
Nodes (24): _agendarGrupoRemovedIds, _aplicarGrupoRemovedIds, appGroups, appointments, appUsers, _auditCalYear, _auditCtx, auditLog (+16 more)

### Community 10 - "Pacientes (Patients) CRUD"
Cohesion: 0.14
Nodes (18): Modal Excluir Paciente, Modal Cadastro/Edição de Paciente, Modal Bloqueio Paciente Duplicado, Modal Histórico do Paciente, Grid de Pacientes (patients-grid), Aba Pacientes, checkDeletePatientConfirm(), checkUnderage() (+10 more)

### Community 11 - "Agenda Kanban Rendering & Filters"
Cohesion: 0.11
Nodes (21): adjustFilterWeek(), closeAgendarGrupoModal(), closeAplicarGrupoModal(), closeKanbanCancelModal(), closeMoverGrupoPerdidoModal(), confirmAgendarGrupo(), confirmAplicarGrupo(), confirmKanbanCancel() (+13 more)

### Community 12 - "Agenda Calendar & Weekly Views"
Cohesion: 0.15
Nodes (20): calGoToday(), calNavNext(), calNavPrev(), cancelWeeklyDrop(), changeMonth(), _closPickerOutside(), confirmAgendar(), confirmConcluir() (+12 more)

### Community 13 - "Auth & Login"
Cohesion: 0.23
Nodes (16): Sidebar de Navegação (app-sidebar), Cadastro Primeiro Administrador, Tela de Login, applyPermissions(), checkPerm(), createFirstAdmin(), doLogin(), getFirstAllowedTab() (+8 more)

### Community 14 - "Almoxarifado Movimentação Filters"
Cohesion: 0.19
Nodes (18): confirmDeleteMovimentacao(), confirmMovimentacao(), refreshAlmoxIfActive(), refreshOpenModals(), renderAlmoxLotes(), renderEstoqueDashboard(), renderMovimentacao(), salvarEdicaoMov() (+10 more)

### Community 16 - "Audit Log"
Cohesion: 0.21
Nodes (11): Modal Auditoria / Rastreabilidade, auditCalendarNextYear(), auditCalendarPrevYear(), auditGoToPage(), clearAuditFilter(), deleteAuditEntry(), openAuditModal(), _renderAuditCalendarGrid() (+3 more)

### Community 17 - "Dashboard Analytics"
Cohesion: 0.33
Nodes (10): View Dashboard Analítico, View Dashboard Financeiro, Aba Dashboard, buildRankingTable(), getAppsByPeriodo(), renderDashAnalitico(), renderDashboard(), renderDashFinanceiro() (+2 more)

### Community 18 - "Agenda Group Scheduling (Aplicar)"
Cohesion: 0.20
Nodes (10): cancelRemoveAplicarGrupoLine(), _checkAplicarGrupoBtn(), executeRemoveAplicarGrupoLine(), _handleGroupDrop(), openAgendarGrupoModal(), openAplicarGrupoModal(), openMoverGrupoPerdidoModal(), removeAplicarGrupoLine() (+2 more)

### Community 19 - "Almoxarifado Vaccine View Modal"
Cohesion: 0.22
Nodes (10): getVaccineEstoque(), openVaccineViewModal(), refreshVaccineViewModal(), renderVVLotes(), renderVVMovs(), setVVLoteFilter(), setVVMovFilter(), switchVaccineViewTab() (+2 more)

### Community 20 - "Almoxarifado Movement Modal"
Cohesion: 0.24
Nodes (10): onMovLoteChange(), onMovVaccineChange(), openMovimentacaoEntrada(), openMovimentacaoSaida(), openMovModal(), openVVMovEntrada(), openVVMovSaida(), populateMovLoteSelect() (+2 more)

### Community 21 - "Agenda Vendedor Popover (Calendar)"
Cohesion: 0.36
Nodes (8): _applyVendedorPopoverSearchCal(), _closeVendedorPopoverCal(), filterVendedorPopoverListCal(), _populateCalVendedorList(), selectVendedorFilterCal(), toggleVendedorPopoverCal(), _updateVendedorBtnCal(), _vendedorPopOutsideCal()

### Community 22 - "Config & Firebase Settings"
Cohesion: 0.29
Nodes (3): Modal Configurações do Sistema, db, _fbConfig

### Community 23 - "Agenda Month/Year Picker"
Cohesion: 0.33
Nodes (7): pickerChangeMonth(), pickerChangeYear(), _positionPicker(), renderMonthYearPicker(), _renderPickerMonthMode(), _renderPickerWeekMode(), toggleMonthYearPicker()

### Community 24 - "Almoxarifado Lote Stock Queries"
Cohesion: 0.33
Nodes (7): deleteMovimentacao(), getLoteAplicado(), getLoteDisponivelParaAgendamento(), getLoteEntradas(), getLoteEstoque(), getLoteReservado(), getLoteSaidasManuais()

### Community 26 - "Backup"
Cohesion: 0.40
Nodes (3): Aba Configurações: Backup, checkBackupConfirm(), prepareBackupUpload()

### Community 27 - "Agenda Group Scheduling Modals"
Cohesion: 0.33
Nodes (6): checkAgendarData(), checkConcluirLote(), kanbanDrop(), openAgendarModal(), openConcluirModal(), openKanbanCancelModal()

## Ambiguous Edges - Review These
- `firebase.js` → `Loading Overlay (Conectando ao servidor)`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to

## Knowledge Gaps
- **112 isolated node(s):** `_vendedorPopoverNamesCal`, `MONTHS_PICKER`, `MONTHS_FULL`, `_pickerYear`, `_pickerMonth` (+107 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `firebase.js` and `Loading Overlay (Conectando ao servidor)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Kanban de Agendamentos` connect `Agenda Table View` to `Appointments Modal & Records`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `Sidebar de Navegação (app-sidebar)` connect `Auth & Login` to `UI Shell & Dashboard Popovers`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `_vendedorPopoverNamesCal`, `MONTHS_PICKER`, `MONTHS_FULL` to the rest of the system?**
  _112 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Oportunidades (Vaccine Opportunities)` be split into smaller, more focused modules?**
  _Cohesion score 0.057124310288867254 - nodes in this community are weakly interconnected._
- **Should `Appointments Modal & Records` be split into smaller, more focused modules?**
  _Cohesion score 0.05879692446856626 - nodes in this community are weakly interconnected._
- **Should `UI Shell & Dashboard Popovers` be split into smaller, more focused modules?**
  _Cohesion score 0.06711915535444947 - nodes in this community are weakly interconnected._