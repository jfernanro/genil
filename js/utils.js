import { CONFIG } from './config.js';

export function getAlerta(nivel) {
    if (nivel >= CONFIG.UMBRALES.critico) return { key: 'critico', texto: 'CRITICO' };
    if (nivel >= CONFIG.UMBRALES.rojo) return { key: 'rojo', texto: 'EMERGENCIA' };
    if (nivel >= CONFIG.UMBRALES.naranja) return { key: 'naranja', texto: 'ALERTA' };
    if (nivel >= CONFIG.UMBRALES.amarillo) return { key: 'amarillo', texto: 'PRECAUCION' };
    return { key: 'verde', texto: 'NORMAL' };
}

export function calcTendencia(hist, ventana) {
    if (hist.length < ventana + 1) return { texto: '--', color: 'var(--text-muted)' };
    var actual = hist[hist.length - 1].nivel;
    var anterior = hist[hist.length - 1 - ventana].nivel;
    var diff = actual - anterior;
    if (diff > 0.1) return { texto: 'Subiendo', color: 'var(--rojo)' };
    if (diff < -0.1) return { texto: 'Bajando', color: 'var(--verde)' };
    return { texto: 'Estable', color: 'var(--text-muted)' };
}

export function calcVariacion(hist, ventana) {
    if (hist.length < ventana + 1) return '--';
    var actual = hist[hist.length - 1].nivel;
    var anterior = hist[hist.length - 1 - ventana].nivel;
    var diff = actual - anterior;
    var sign = diff >= 0 ? '+' : '';
    return sign + diff.toFixed(2) + ' m';
}

export function calcVentanaReal(hist, ventana) {
    if (hist.length < ventana + 1) return null;
    var tsActual = new Date(hist[hist.length - 1].timestamp).getTime();
    var tsAnterior = new Date(hist[hist.length - 1 - ventana].timestamp).getTime();
    return Math.round((tsActual - tsAnterior) / 60000);
}

export function formatMinutos(minutos) {
    if (minutos === null) return '--';
    if (minutos < 60) return minutos + ' min';
    var h = Math.floor(minutos / 60);
    var m = minutos % 60;
    if (m === 0) return h + 'h';
    return h + 'h ' + m + 'min';
}

export function formatVentanaEstimada(lecturas) {
    return '~' + formatMinutos(lecturas * CONFIG.INTERVAL_MINUTES);
}

export function maxVentanaDisponible(hist) {
    var max = hist.length - 1;
    if (max < CONFIG.MIN_WINDOW) return CONFIG.MIN_WINDOW;
    if (max > CONFIG.MAX_WINDOW) return CONFIG.MAX_WINDOW;
    return max;
}

export function isStale(ts) {
    if (!ts) return false;
    return (Date.now() - new Date(ts).getTime()) / 60000 > CONFIG.STALE_MINUTES;
}

export function formatTime(ts) {
    if (!ts) return '--:--';
    return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(ts) {
    if (!ts) return '--';
    return new Date(ts).toLocaleString('es-ES');
}