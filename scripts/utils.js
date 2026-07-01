// ─── UTILITY / HELPER FUNCTIONS (from index.html lines ~2379-2475) ───────────

function normalizeStr(str) {
    if(!str) return '';
    return str.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function getDisplayName(fullName) {
    if (!fullName) return { display: '—', initials: '?' };
    const parts = fullName.trim().split(/\s+/).filter(w => w.length > 0);
    const meaningful = parts.filter(w => !_nameArticles.has(w.toLowerCase()));
    if (!meaningful.length) meaningful.push(...parts);
    const display = meaningful.length >= 2
        ? meaningful[0] + ' ' + meaningful[1]
        : meaningful[0];
    const initials = [meaningful[0], meaningful.length >= 2 ? meaningful[1] : null]
        .filter(Boolean).map(w => w[0]).join('').toUpperCase();
    return { display, initials };
}

function getAge(dateStr) {
    if(!dateStr) return 0;
    const today = new Date();
    const birthDate = new Date(dateStr);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}

function getAgeInMonths(dateStr, refDateStr) {
    if(!dateStr) return {years: 0, months: 0};
    const today = refDateStr ? new Date(refDateStr + 'T00:00:00') : new Date();
    const birthDate = new Date(dateStr);
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if(months < 0) {
        years--;
        months += 12;
    }
    if(today.getDate() < birthDate.getDate()) {
        months--;
        if(months < 0) {
            years--;
            months += 12;
        }
    }
    return {years: years, months: months};
}

function getAgeDisplay(dateStr, refDateStr) {
    const {years, months} = getAgeInMonths(dateStr, refDateStr);
    const today = refDateStr ? new Date(refDateStr + 'T00:00:00') : new Date();
    const birth = new Date(dateStr);
    if (years === 0 && months === 0) {
        const days = Math.max(0, Math.floor((today - birth) / 86400000));
        return days + (days === 1 ? ' dia' : ' dias');
    }
    if (years === 0) {
        // dias restantes após os meses completos
        const afterMonths = new Date(birth.getFullYear(), birth.getMonth() + months, birth.getDate());
        const days = Math.max(0, Math.floor((today - afterMonths) / 86400000));
        const mStr = months + (months === 1 ? ' mês' : ' meses');
        return days > 0 ? mStr + ' e ' + days + (days === 1 ? ' dia' : ' dias') : mStr;
    }
    if (months === 0) return years + (years === 1 ? ' ano' : ' anos');
    return years + (years === 1 ? ' ano' : ' anos') + ' e ' + months + (months === 1 ? ' mês' : ' meses');
}

function formatWa(num) { return num.replace(/\D/g,''); }

function maskPhone(input) {
    let d = input.value.replace(/\D/g,'').slice(0,11);
    if(d.length > 10) d = d.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3');
    else if(d.length > 6) d = d.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3');
    else if(d.length > 2) d = d.replace(/(\d{2})(\d{0,5})/,'($1) $2');
    else if(d.length > 0) d = d.replace(/(\d{0,2})/,'($1');
    input.value = d;
    const digits = input.value.replace(/\D/g,'').length;
    input.setCustomValidity(digits < 10 ? 'Informe um número válido com DDD (10 ou 11 dígitos).' : '');
}

function formatPhone(num) {
    const d = num.replace(/\D/g,'').slice(0,11);
    if(d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if(d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    return num;
}

function maskCurrency(input) {
    let v = input.value.replace(/\D/g, '');
    if (!v) { input.value = ''; return; }
    v = (parseInt(v) / 100).toFixed(2);
    const [int, dec] = v.split('.');
    input.value = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec;
}

function formatCurrency(val) {
    if (!val) return 'R$ 0,00';
    const clean = String(val).replace('R$', '').trim();
    return 'R$ ' + clean;
}

function sanitizeLogin(val) {
    return val.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function maskCPF(input) {
    let v = input.value.replace(/\D/g,'').slice(0,11);
    if(v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/,'$1.$2.$3-$4');
    else if(v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{0,3})/,'$1.$2.$3');
    else if(v.length > 3) v = v.replace(/(\d{3})(\d{0,3})/,'$1.$2');
    input.value = v;
}

function showNotification(msg, type='info') {
    const container = document.getElementById('notification-container');
    const el = document.createElement('div');
    el.className = `notification bg-white border-l-4 ${type==='success'?'border-green-500':type==='error'?'border-red-500':'border-blue-500'} p-4 rounded shadow-lg text-sm font-bold flex items-center gap-3`;
    el.innerHTML = `<i class="fas ${type==='success'?'fa-check text-green-500':type==='error'?'fa-times text-red-500':'fa-info text-blue-500'}"></i> ${msg}`;
    container.appendChild(el); setTimeout(()=>el.remove(), 5000);
}

function closeModals() { document.querySelectorAll('.modal').forEach(m => m.classList.remove('active')); }

// ─── BRL parsing helpers (used in discount module) ───────────────────────────
function parseBRL(str) {
    return parseFloat(String(str || '0').replace(/\./g, '').replace(',', '.')) || 0;
}

function formatBRL(num) {
    return num.toFixed(2).replace('.', ',');
}
