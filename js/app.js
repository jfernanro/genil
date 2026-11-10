import { CONFIG } from './config.js';
import { loadHistorico, fetchData } from './api.js';
import { render, bindEventListeners } from './ui.js';
import { initChart } from './chart.js';
import { toggleTheme } from './theme.js';
import { initInstall } from './install.js';

var state = {
    nivel: 0,
    caudal: 0,
    timestamp: null,
    status: 'loading',
    lastAttempt: null,
    historico: [],
    refreshing: false,
    ventana: CONFIG.DEFAULT_WINDOW
};

function refresh() {
    render(state);

    if (state.historico.length > 1) {
        var canvas = document.getElementById('chart-canvas');
        if (canvas) {
            initChart(canvas, state.historico);
        }
    }
}

function onToggleTheme() {
    toggleTheme();
    refresh();
}

async function onRefresh() {
    await fetchData(state);
    refresh();
}

// Chart.js mide las etiquetas al crearse: si la fuente aún no ha cargado, mide con otra y las corta
function loadChartFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
        document.fonts.load('11px "JetBrains Mono"'),
        document.fonts.load('10px Outfit')
    ]).catch(function () { });
}

async function init() {
    var fonts = loadChartFonts();
    var entries = await loadHistorico();
    if (entries.length > 0) {
        state.historico = entries;
    }

    await fetchData(state);
    await fonts;
    refresh();
    bindEventListeners(state, onRefresh, onToggleTheme);

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

initInstall();

init();