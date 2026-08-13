// ─── FIREBASE SYNC FUNCTIONS (from index.html lines 2057-2171) ───────────────

function setupRealtimeSync() {
    // Renders passam por scheduleRender(): snapshots em rajada colapsam num único
    // render por frame em vez de re-renderizar a tela inteira por evento.
    const _scheduleOportunidades = () => {
        const el = document.getElementById('agendaview-oportunidades');
        if (el && !el.classList.contains('hidden') && typeof renderOportunidades === 'function') {
            scheduleRender('renderOportunidades', renderOportunidades);
        }
    };

    db.ref('patients').on('value', snap => {
        patients = _fbToArr(snap.val());
        if (_appReady) {
            scheduleRender('renderPatients', renderPatients);
            scheduleRender('populateDashDropdowns', populateDashDropdowns);
            _scheduleOportunidades();
        }
    });
    db.ref('vaccines').on('value', snap => {
        vaccines = _fbToArr(snap.val());
        if (_appReady) {
            scheduleRender('renderVaccines', renderVaccines);
            scheduleRender('populateVaccineSelects', populateVaccineSelects);
            scheduleRender('updateExpiryBadge', updateExpiryBadge);
            scheduleRender('populateDashDropdowns', populateDashDropdowns);
            _scheduleOportunidades();
        }
    });
    db.ref('appointments').on('value', snap => {
        appointments = _fbToArr(snap.val());
        if (_appReady) {
            scheduleRender('renderCalendar', renderCalendar);
            scheduleRender('renderTable', renderTable);
            scheduleRender('renderPatients', renderPatients);
            if (typeof updateSemLoteBadge === 'function') updateSemLoteBadge();
            const _slPanel = document.getElementById('semlote-panel');
            if (_slPanel && !_slPanel.classList.contains('hidden')) renderSemLotePanel();
            if (document.getElementById('tab-dashboard').classList.contains('active')) {
                scheduleRender('renderDashboard', renderDashboard);
            }
            _scheduleOportunidades();
        }
    });
    db.ref('cancelReasons').on('value', snap => {
        cancelReasons = _normalizeSimpleArr(snap.val());
        if (!cancelReasons.length) cancelReasons = ['Paciente desistiu','Contraindicação médica','Falta de estoque','Não compareceu','Aplicou em outro local'];
        if (_appReady) populateCancelReasons();
    });
    db.ref('holidays').on('value', snap => {
        holidays = _normalizeSimpleArr(snap.val());
        if (_appReady) renderCalendar();
    });
    db.ref('vaccineLots').on('value', snap => {
        vaccineLots = _fbToArr(snap.val());
        if (_appReady) { updateExpiryBadge(); refreshAlmoxIfActive(); }
    });
    db.ref('stockMovements').on('value', snap => {
        stockMovements = _fbToArr(snap.val());
        if (_appReady) refreshAlmoxIfActive();
    });
    db.ref('auditLog').on('value', snap => {
        auditLog = _fbToArr(snap.val()).sort((a, b) => new Date(b.ts) - new Date(a.ts));
    });
    db.ref('patientContacts').on('value', snap => {
        patientContacts = _fbToArr(snap.val());
        if (_appReady) {
            updateContactsBadge();
            if (typeof renderKanban === 'function') scheduleRender('renderKanban', renderKanban);
            const modal = document.getElementById('modal-patient-history');
            if (modal && modal.classList.contains('active') && _prontuarioTab === 'contato') {
                renderContatoTab(modal.dataset.patientId);
            }
        }
    });
    db.ref('appUsers').on('value', snap => {
        appUsers = _fbToArr(snap.val());
        if (_appReady) renderUsersList();
    });
    db.ref('appGroups').on('value', snap => {
        appGroups = _fbToArr(snap.val());
        if (_appReady) { renderGroupsList(); populateGroupSelect(); }
    });
    db.ref('cpniImunoMap').on('value', snap => {
        cpniImunoMap = snap.val() || {};
    });
    db.ref('appSettings').on('value', snap => {
        appSettings = Object.assign({ allowSelfRegister: false, defaultGroupId: null }, snap.val() || {});
        if (_appReady) { renderGroupsList(); if (typeof updateSelfRegisterUI === 'function') updateSelfRegisterUI(); }
    });
}

function initFromFirebase() {
    return db.ref().once('value').then(snap => {
        const data = snap.val() || {};
        patients      = _fbToArr(data.patients);
        vaccines      = _fbToArr(data.vaccines);
        appointments  = _fbToArr(data.appointments);
        cancelReasons = _normalizeSimpleArr(data.cancelReasons);
        if (!cancelReasons.length) cancelReasons = ['Paciente desistiu','Contraindicação médica','Falta de estoque','Não compareceu','Aplicou em outro local'];
        holidays      = _normalizeSimpleArr(data.holidays);
        vaccineLots   = _fbToArr(data.vaccineLots);
        stockMovements = _fbToArr(data.stockMovements);
        patientContacts = _fbToArr(data.patientContacts);
        auditLog      = _fbToArr(data.auditLog).sort((a, b) => new Date(b.ts) - new Date(a.ts));
        appUsers      = _fbToArr(data.appUsers);
        appGroups     = _fbToArr(data.appGroups);
        appSettings   = Object.assign({ allowSelfRegister: false, defaultGroupId: null }, data.appSettings || {});
        cpniImunoMap  = data.cpniImunoMap || {};
        if (patients.length === 0 && vaccines.length === 0) {
            patients = [
                {id:1, nome:'JOÃO DA SILVA', cpf:'111.111.111-11', dtNasc:'1990-05-15', contato:'88999999999', responsavel:''},
                {id:2, nome:'MARIA OLIVEIRA', cpf:'222.222.222-22', dtNasc:'2018-10-20', contato:'88988888888', responsavel:'ANA OLIVEIRA'}
            ];
            vaccines = [
                {id:1, nome:'HEXAVALENTE', numDoses:3, reforco:true, doseUnica:false, intervaloDias:60, intervalos:[60,60], idadeMinimaAnos:0, idadeMinimaMeses:0, valor:'R$ 350,00', ativo:true},
                {id:2, nome:'HPV NONAVALENTE', numDoses:2, reforco:false, doseUnica:false, intervaloDias:180, intervalos:[180], idadeMinimaAnos:9, idadeMinimaMeses:0, valor:'R$ 900,00', ativo:true},
                {id:3, nome:'FEBRE AMARELA', numDoses:1, reforco:false, doseUnica:true, intervaloDias:0, intervalos:[], idadeMinimaAnos:1, idadeMinimaMeses:0, valor:'R$ 200,00', ativo:true}
            ];
            return db.ref().update({
                patients:      _arrToFbObj(patients),
                vaccines:      _arrToFbObj(vaccines),
                cancelReasons: cancelReasons
            });
        }
    });
}

function _fbSaveNow() {
    clearTimeout(_fbSaveTimer);
    _fbSaveTimer = null;
    db.ref().update({
        patients:      _arrToFbObj(patients),
        vaccines:      _arrToFbObj(vaccines),
        appointments:  _arrToFbObj(appointments),
        cancelReasons: cancelReasons,
        holidays:      holidays,
        vaccineLots:   _arrToFbObj(vaccineLots),
        stockMovements: _arrToFbObj(stockMovements),
        patientContacts: _arrToFbObj(patientContacts),
        cpniImunoMap:  cpniImunoMap
    }).catch(err => console.error('[FB] saveAll:', err));
}

function saveAll() {
    clearTimeout(_fbSaveTimer);
    _fbSaveTimer = setTimeout(_fbSaveNow, 300);
}

// Garante que uma gravação pendente (debounce de 300ms) não se perca caso o
// usuário atualize/feche a página logo após salvar (ex.: editar reforço e
// dar refresh na sequência para conferir).
window.addEventListener('beforeunload', () => { if (_fbSaveTimer) _fbSaveNow(); });
window.addEventListener('pagehide', () => { if (_fbSaveTimer) _fbSaveNow(); });

function saveUsersData() {
    db.ref().update({
        appUsers:  _arrToFbObj(appUsers),
        appGroups: _arrToFbObj(appGroups)
    }).catch(err => console.error('[FB] saveUsersData:', err));
}

function saveAppSettings() {
    db.ref('appSettings').set(appSettings).catch(err => console.error('[FB] saveAppSettings:', err));
}
