// ─── UTILITY / HELPER FUNCTIONS (from index.html lines ~2379-2475) ───────────

function normalizeStr(str) {
    if(!str) return '';
    return str.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

// ─── LOOKUP INDEXES ───────────────────────────────────────────────────────────
// Substituem patients.find()/vaccines.find() dentro de laços (O(N×M) → O(N)).
// O cache é auto-invalidante: guarda a referência do array e seu tamanho, então
// reatribuições (`patients = ...`) e push/filter/map disparam rebuild sozinhos.
// Mutação in-place de um item (ex.: patients[i].nome = x) não altera identidade
// nem tamanho — e não precisa invalidar, pois o Map guarda o mesmo objeto.
const _idxCache = { pat: null, patSrc: null, patLen: -1, vac: null, vacSrc: null, vacLen: -1 };

function _buildIdIndex(arr) {
    const m = new Map();
    for (const item of arr) m.set(String(item.id), item);
    return m;
}

function getPatientsIndex() {
    if (_idxCache.patSrc !== patients || _idxCache.patLen !== patients.length) {
        _idxCache.pat = _buildIdIndex(patients);
        _idxCache.patSrc = patients;
        _idxCache.patLen = patients.length;
    }
    return _idxCache.pat;
}

function getVaccinesIndex() {
    if (_idxCache.vacSrc !== vaccines || _idxCache.vacLen !== vaccines.length) {
        _idxCache.vac = _buildIdIndex(vaccines);
        _idxCache.vacSrc = vaccines;
        _idxCache.vacLen = vaccines.length;
    }
    return _idxCache.vac;
}

// Força rebuild no próximo acesso. Chamar após edições in-place que troquem `id`.
function invalidateLookupIndexes() {
    _idxCache.patSrc = null; _idxCache.patLen = -1;
    _idxCache.vacSrc = null; _idxCache.vacLen = -1;
}

function getPatientById(id) { return getPatientsIndex().get(String(id)); }
function getVaccineById(id) { return getVaccinesIndex().get(String(id)); }

// ─── RENDER SCHEDULER ─────────────────────────────────────────────────────────
// Um snapshot do Firebase costuma disparar renderCalendar + renderTable +
// renderPatients + renderDashboard de uma vez, e vários snapshots podem chegar
// em sequência. scheduleRender() agrupa as chamadas do mesmo frame: cada render
// roda no máximo uma vez por frame, na ordem em que foi pedido.
const _pendingRenders = new Map();
let _renderFrame = null;

function _flushRenders() {
    _renderFrame = null;
    const jobs = [..._pendingRenders.values()];
    _pendingRenders.clear();
    for (const fn of jobs) {
        try { fn(); } catch (err) { console.error('[render]', err); }
    }
}

function scheduleRender(name, fn) {
    const job = fn || (typeof window[name] === 'function' ? window[name] : null);
    if (!job) return;
    _pendingRenders.set(name, job);
    if (_renderFrame === null) _renderFrame = requestAnimationFrame(_flushRenders);
}

// ─── PAGINAÇÃO ────────────────────────────────────────────────────────────────
// Fatia uma lista já filtrada/ordenada e devolve a página + os metadados que a
// barra de controles precisa. `page` é corrigido para caber no total, então
// remover itens nunca deixa o usuário preso numa página vazia.
function paginate(items, page, pageSize) {
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(0, page || 0), totalPages - 1);
    const start = safePage * pageSize;
    const end = Math.min(start + pageSize, total);
    return {
        items: items.slice(start, end),
        page: safePage, totalPages, total,
        from: total ? start + 1 : 0,
        to: end,
        hasPrev: safePage > 0,
        hasNext: safePage < totalPages - 1
    };
}

// Janela de números de página com elipse: 1 … 4 5 [6] 7 8 … 20
function _pageWindow(page, totalPages) {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const out = [0];
    let lo = Math.max(1, page - 1), hi = Math.min(totalPages - 2, page + 1);
    if (page <= 2) hi = 3;
    if (page >= totalPages - 3) lo = totalPages - 4;
    if (lo > 1) out.push('…');
    for (let i = lo; i <= hi; i++) out.push(i);
    if (hi < totalPages - 2) out.push('…');
    out.push(totalPages - 1);
    return out;
}

// Barra de paginação. `onGo` é o nome de uma função global que recebe o índice
// da página (0-based), ex.: 'goTablePage'. Devolve '' quando só há uma página.
function renderPagination(p, onGo, itemLabel = 'itens') {
    if (p.totalPages <= 1) return '';
    const _d = document.body.classList.contains('dark-mode');
    const bg     = _d ? '#1e293b' : '#ffffff';
    const border = _d ? '#334155' : '#e2e8f0';
    const txt    = _d ? '#94a3b8' : '#64748b';
    const strong = _d ? '#f1f5f9' : '#172554';
    const accent = '#4f46e5';

    const btn = (target, disabled, icon, title) => `
        <button type="button" onclick="${onGo}(${target})" ${disabled ? 'disabled' : ''} title="${title}"
            class="h-8 w-8 rounded-lg flex items-center justify-center border transition disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-sm active:scale-90"
            style="background:${bg};border-color:${border};color:${disabled ? txt : accent}">
            <i class="fas ${icon} text-[11px]"></i>
        </button>`;

    const nums = _pageWindow(p.page, p.totalPages).map(i => {
        if (i === '…') return `<span class="px-1 text-[11px] font-black" style="color:${txt}">…</span>`;
        const active = i === p.page;
        return `<button type="button" onclick="${onGo}(${i})"
            class="h-8 min-w-[32px] px-2 rounded-lg text-[11px] font-black border transition hover:shadow-sm active:scale-90"
            style="background:${active ? accent : bg};border-color:${active ? accent : border};color:${active ? '#fff' : txt}">${i + 1}</button>`;
    }).join('');

    return `
        <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style="background:${bg};border-top:1px solid ${border}">
            <span class="text-[11px] font-bold" style="color:${txt}">
                <span style="color:${strong}">${p.from}–${p.to}</span> de <span style="color:${strong}">${p.total}</span> ${itemLabel}
            </span>
            <div class="flex items-center gap-1.5">
                ${btn(0, !p.hasPrev, 'fa-angles-left', 'Primeira página')}
                ${btn(p.page - 1, !p.hasPrev, 'fa-chevron-left', 'Página anterior')}
                ${nums}
                ${btn(p.page + 1, !p.hasNext, 'fa-chevron-right', 'Próxima página')}
                ${btn(p.totalPages - 1, !p.hasNext, 'fa-angles-right', 'Última página')}
            </div>
        </div>`;
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

function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    const _mr = document.getElementById('modal-record');
    if (_mr) _mr.style.removeProperty('z-index');
    const _mp = document.getElementById('modal-paciente');
    if (_mp) _mp.style.removeProperty('z-index');
    window._agendaOpenedFromProntuario = false;
    _patientModalOpenedFromHistory = false;
}

// ─── BRL parsing helpers (used in discount module) ───────────────────────────
function parseBRL(str) {
    return parseFloat(String(str || '0').replace(/\./g, '').replace(',', '.')) || 0;
}

function formatBRL(num) {
    return num.toFixed(2).replace('.', ',');
}

// ─── REFORÇOS (múltiplos, até 3) ──────────────────────────────────────────────
// Vacina armazena v.reforcos = [{meses:12}, {meses:24}, ...] (até 3 itens).
// v.reforco/v.reforcoMeses são mantidos como legado (derivados do 1º reforço)
// para compatibilidade com dados antigos e código ainda não migrado.
const REFORCO_MAX = 3;

function reforcoLabel(n) {
    return n <= 1 ? 'Reforço' : `${n}º Reforço`;
}

// Extrai o índice (1..N) de um label de reforço, ou null se não for reforço.
function reforcoIndexFromLabel(doseStr) {
    if (!doseStr) return null;
    if (doseStr === 'Reforço') return 1;
    const m = /^(\d+)º Reforço$/.exec(doseStr);
    return m ? parseInt(m[1], 10) : null;
}

// Lista normalizada de reforços de uma vacina (sempre a partir de v.reforcos,
// com fallback para o formato legado v.reforco/v.reforcoMeses).
function getVaccineReforcos(v) {
    if (!v) return [];
    if (Array.isArray(v.reforcos) && v.reforcos.length) return v.reforcos.slice(0, REFORCO_MAX);
    if (v.reforco) return [{ meses: v.reforcoMeses || null }];
    return [];
}
