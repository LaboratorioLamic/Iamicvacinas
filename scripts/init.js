// ─── BOOTSTRAP / INITIALIZATION (from index.html lines ~6643-6669) ───────────

document.addEventListener('DOMContentLoaded', () => {
    const loadingEl = document.getElementById('loading-overlay');
    initFromFirebase().then(() => {
        setupRealtimeSync();
        document.getElementById('dash-ano-base').value = new Date().getFullYear();
        populatePatientDatalist(); populateVaccineSelects(); renderVaccines(); renderPatients();
        const initTab = getFirstAllowedTab() || 'agenda';
        switchTab(initTab);
        updateExpiryBadge();
        initAuth();
        _appReady = true;
        if (loadingEl) loadingEl.style.display = 'none';
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('expiry-panel');
            const bell  = document.getElementById('btn-expiry-bell');
            if (!panel || !bell) return;
            if (!panel.classList.contains('hidden') && !panel.contains(e.target) && !bell.contains(e.target)) {
                panel.classList.add('hidden');
                panel.classList.remove('flex');
            }
        });
    }).catch(err => {
        console.error('[FB] initFromFirebase:', err);
        if (loadingEl) loadingEl.innerHTML = '<div class="text-center p-8"><i class="fas fa-exclamation-triangle text-red-500 text-5xl mb-4 block"></i><p class="text-white font-black uppercase tracking-widest text-sm">Erro ao conectar ao servidor</p><p class="text-slate-400 text-xs mt-3 max-w-sm">Verifique a conexão com a internet e as regras do Firebase Realtime Database, depois recarregue a página.</p></div>';
    });
});
