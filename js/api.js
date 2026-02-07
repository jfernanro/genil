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

export async function fetchData(state) {
    state.refreshing = true;

    try {
        var res = await fetch(CONFIG.DATA_URL + '?t=' + Date.now());
        if (!res.ok) throw new Error('HTTP ' + res.status);

        var json = await res.json();

        if (json.status === 'error') {
            state.status = 'error';
            state.refreshing = false;
            return;
        }

        state.nivel = json.nivel;
        state.caudal = json.caudal;
        state.timestamp = json.timestamp;
        state.status = 'ok';
        state.refreshing = false;

        var timeLabel = formatTime(json.timestamp);
        var last = state.historico[state.historico.length - 1];

        if (!last || last.timestamp !== json.timestamp) {
            state.historico.push({
                label: timeLabel,
                nivel: json.nivel,
                caudal: json.caudal,
                timestamp: json.timestamp
            });
        }
    } catch (err) {
        console.warn('Error obteniendo datos:', err);
        state.status = 'error';
        state.refreshing = false;
    }
}