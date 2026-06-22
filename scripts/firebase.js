// ─── FIREBASE SYNC FUNCTIONS (from index.html lines 2057-2171) ───────────────

function setupRealtimeSync() {
    db.ref('patients').on('value', snap => {
        patients = _fbToArr(snap.val());
        if (_appReady) { renderPatients(); populateDashDropdowns(); }
    });
    db.ref('vaccines').on('value', snap => {
        vaccines = _fbToArr(snap.val());
        if (_appReady) { renderVaccines(); populateVaccineSelects(); updateExpiryBadge(); populateDashDropdowns(); }
    });
    db.ref('appointments').on('value', snap => {
        appointments = _fbToArr(snap.val());
        if (_appReady) {
            renderCalendar(); renderTable(); renderPatients();
            if (document.getElementById('tab-dashboard').classList.contains('active')) renderDashboard();
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
        if (_appReady) updateExpiryBadge();
    });
    db.ref('auditLog').on('value', snap => {
        auditLog = _fbToArr(snap.val()).sort((a, b) => new Date(b.ts) - new Date(a.ts));
    });
    db.ref('appUsers').on('value', snap => {
        appUsers = _fbToArr(snap.val());
        if (_appReady) renderUsersList();
    });
    db.ref('appGroups').on('value', snap => {
        appGroups = _fbToArr(snap.val());
        if (_appReady) { renderGroupsList(); populateGroupSelect(); }
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
        auditLog      = _fbToArr(data.auditLog).sort((a, b) => new Date(b.ts) - new Date(a.ts));
        appUsers      = _fbToArr(data.appUsers);
        appGroups     = _fbToArr(data.appGroups);
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

function saveAll() {
    clearTimeout(_fbSaveTimer);
    _fbSaveTimer = setTimeout(() => {
        db.ref().update({
            patients:      _arrToFbObj(patients),
            vaccines:      _arrToFbObj(vaccines),
            appointments:  _arrToFbObj(appointments),
            cancelReasons: cancelReasons,
            holidays:      holidays,
            vaccineLots:   _arrToFbObj(vaccineLots)
        }).catch(err => console.error('[FB] saveAll:', err));
    }, 300);
}

function saveUsersData() {
    db.ref().update({
        appUsers:  _arrToFbObj(appUsers),
        appGroups: _arrToFbObj(appGroups)
    }).catch(err => console.error('[FB] saveUsersData:', err));
}
