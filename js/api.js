import { CONFIG } from './config.js';
import { formatTime } from './utils.js';

export async function loadHistorico() {
    try {
        var res = await fetch(CONFIG.HISTORICO_URL + '?t=' + Date.now());
        if (!res.ok) return [];
        var arr = await res.json();
        if (!Array.isArray(arr)) return [];
        return arr.map(function (e) {
            return {
                label: formatTime(e.timestamp),
                nivel: e.nivel,
                caudal: e.caudal,
                timestamp: e.timestamp
            };
        });
    } catch (err) {
        console.warn('Error cargando historico:', err);
        return [];
    }
}

function isValidReading(nivel, ts) {
    return typeof nivel === 'number' && isFinite(nivel) && !!ts;
}

function applyReading(state, nivel, caudal, ts) {
    var newest = state.historico[state.historico.length - 1];

    // Lectura mas antigua que la ultima conocida (p.ej. datos.json cacheado): se muestra la mas reciente
    if (newest && new Date(ts).getTime() < new Date(newest.timestamp).getTime()) {
        nivel = newest.nivel;
        caudal = newest.caudal;
        ts = newest.timestamp;
    }

    state.nivel = nivel;
    state.caudal = caudal == null ? 0 : caudal;
    state.timestamp = ts;

    var timeLabel = formatTime(ts);
    var last = state.historico[state.historico.length - 1];

    if (!last || last.timestamp !== ts) {
        state.historico.push({
            label: timeLabel,
            nivel: nivel,
            caudal: caudal,
            timestamp: ts
        });
    }
}

function useHistoricoFallback(state) {
    var last = state.historico[state.historico.length - 1];

    if (last && isValidReading(last.nivel, last.timestamp)) {
        state.nivel = last.nivel;
        state.caudal = last.caudal == null ? 0 : last.caudal;
        state.timestamp = last.timestamp;
        state.status = 'fallback';
    } else {
        state.status = 'error';
    }
}

export async function fetchData(state) {
    state.refreshing = true;

    try {
        var res = await fetch(CONFIG.DATA_URL + '?t=' + Date.now());
        if (!res.ok) throw new Error('HTTP ' + res.status);

        var json = await res.json();

        if (json.status === 'error') {
            state.lastAttempt = json.last_attempt || json.timestamp || null;

            if (json.last_attempt && isValidReading(json.nivel, json.timestamp)) {
                applyReading(state, json.nivel, json.caudal, json.timestamp);
                state.status = 'fallback';
            } else {
                useHistoricoFallback(state);
            }

            state.refreshing = false;
            return;
        }

        applyReading(state, json.nivel, json.caudal, json.timestamp);
        state.lastAttempt = null;
        state.status = 'ok';
        state.refreshing = false;
    } catch (err) {
        console.warn('Error obteniendo datos:', err);
        state.lastAttempt = null;
        useHistoricoFallback(state);
        state.refreshing = false;
    }
}