// ─── TAILWIND CONFIG (from index.html lines 14-18) ─────────────────────────
tailwind.config = {
    theme: { extend: { colors: { navy: { 700: '#1e3a8a', 800: '#172554', 900: '#0f172a' }, clinic: { 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' } } } }
}

// ─── FIREBASE CONFIG & INIT (from index.html lines 2025-2035) ───────────────
// ATENÇÃO: configure as Realtime Database Rules no console Firebase:
// { "rules": { ".read": true, ".write": true } }
const _fbConfig = {
    apiKey: "AIzaSyDXRBeAI7GYm_9nEsiXi9upsTnC-syvuUo",
    authDomain: "lamicvacinas-4b916.firebaseapp.com",
    projectId: "lamicvacinas-4b916",
    storageBucket: "lamicvacinas-4b916.firebasestorage.app",
    messagingSenderId: "945327811365",
    appId: "1:945327811365:web:167d7ffb0d69f2cf2588cc",
    databaseURL: "https://lamicvacinas-4b916-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(_fbConfig);
const db = firebase.database();

// ─── FIREBASE HELPERS (from index.html lines 2037-2052) ─────────────────────
function _fbToArr(obj) {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj.filter(x => x != null);
    return Object.values(obj).filter(x => x != null);
}
function _arrToFbObj(arr) {
    if (!arr || !arr.length) return {};
    const o = {};
    arr.forEach(item => { if (item != null && item.id != null) o[String(item.id)] = item; });
    return o;
}
function _normalizeSimpleArr(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return Object.values(val);
}
