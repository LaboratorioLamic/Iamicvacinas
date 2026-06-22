// ─── BACKUP FUNCTIONS (from index.html lines ~6564-6641) ─────────────────────

function downloadBackup() {
    if (!checkPerm('backup')) return;
    const data = {
        version: 2,
        exportedAt: new Date().toISOString(),
        patients, vaccines, appointments, cancelReasons, holidays, vaccineLots,
        appUsers, appGroups
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `imunogest_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Backup exportado com sucesso!', 'success');
}

function prepareBackupUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const data = JSON.parse(ev.target.result);
            if (!data.patients || !data.vaccines) throw new Error('Formato inválido');
            pendingBackupData = data;
            document.getElementById('backup-file-label').textContent = file.name;
            document.getElementById('backup-file-name').classList.remove('hidden');
            document.getElementById('backup-confirm-area').classList.remove('hidden');
            document.getElementById('backup-confirm-input').value = '';
            checkBackupConfirm();
        } catch(err) {
            showNotification('Arquivo inválido. Selecione um backup válido do ImunoGest.', 'error');
            pendingBackupData = null;
            document.getElementById('backup-confirm-area').classList.add('hidden');
            document.getElementById('backup-file-name').classList.add('hidden');
        }
    };
    reader.readAsText(file);
}

function checkBackupConfirm() {
    const val = document.getElementById('backup-confirm-input').value.trim().toUpperCase();
    const btn = document.getElementById('btn-confirm-backup');
    const ok  = val === 'SIM' && !!pendingBackupData;
    btn.disabled = !ok;
    btn.className = ok
        ? 'w-full py-2.5 bg-red-600 text-white font-black rounded-xl text-xs uppercase hover:bg-red-700 transition cursor-pointer shadow-md'
        : 'w-full py-2.5 bg-red-200 text-red-400 font-black rounded-xl text-xs uppercase cursor-not-allowed transition';
}

function doBackupUpload() {
    if (!checkPerm('backup')) return;
    if (!pendingBackupData) return;
    const d = pendingBackupData;
    patients      = d.patients      || [];
    vaccines      = d.vaccines      || [];
    appointments  = d.appointments  || [];
    cancelReasons = d.cancelReasons || [];
    holidays      = d.holidays      || [];
    vaccineLots   = d.vaccineLots   || [];
    if (d.appUsers)  appUsers  = d.appUsers;
    if (d.appGroups) appGroups = d.appGroups;
    saveAll();
    saveUsersData();
    pendingBackupData = null;
    document.getElementById('backup-file-input').value = '';
    document.getElementById('backup-file-name').classList.add('hidden');
    document.getElementById('backup-confirm-area').classList.add('hidden');
    document.getElementById('backup-confirm-input').value = '';
    renderCalendar(); renderTable(); renderDashboard(); renderPatients(); renderVaccines();
    showNotification('Backup importado! Todos os dados foram restaurados.', 'success');
    document.getElementById('modal-settings').classList.remove('active');
}
