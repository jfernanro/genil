import { CONFIG } from './config.js';
import { loadHistorico, fetchData } from './api.js';
import { render, bindEventListeners } from './ui.js';
import { initChart, updateChartData } from './chart.js';

var state = {
    nivel: 0,
    caudal: 0,
    timestamp: null,
    status: 'loading',
    historico: [],
    refreshing: false,
    ventana: CONFIG.DEFAULT_WINDOW
};

var chartReady = false;

function refresh() {
    render(state);

    if (state.historico.length > 1) {
        var canvas = document.getElementById('chart-canvas');
        if (canvas && !chartReady) {
            initChart(canvas, state.historico);
            chartReady = true;
        } else if (chartReady) {
            updateChartData(state.historico);
        }
    }
}

async function onRefresh() {
    await fetchData(state);
    refresh();
}

async function init() {
    var entries = await loadHistorico();
    if (entries.length > 0) {
        state.historico = entries;
    }

    await fetchData(state);
    refresh();
    bindEventListeners(state, onRefresh);

    setInterval(async function () {
        await fetchData(state);
        refresh();
    }, CONFIG.REFRESH_MS);
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(function (err) {
        console.warn('SW registro fallido:', err);
    });
}

init();