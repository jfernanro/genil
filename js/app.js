import { CONFIG } from './config.js';
import { loadHistorico, fetchData } from './api.js';
import { render, bindEventListeners } from './ui.js';
import { updateChart } from './chart.js';

// Estado global de la aplicación
const state = {
    nivel: 0,
    caudal: 0,
    timestamp: null,
    status: 'loading',
    historico: [],
    refreshing: false,
    ventana: CONFIG.DEFAULT_WINDOW
};

// Función de refresh
async function onRefresh() {
    await fetchData(state);
    render(state);
    bindEventListeners(state, onRefresh);
    updateChart(state.historico);
}

// Inicialización
async function init() {
    // Cargar histórico inicial
    const entries = await loadHistorico();
    if (entries.length > 0) {
        state.historico = entries;
    }

    // Primera carga de datos
    await fetchData(state);
    render(state);
    bindEventListeners(state, onRefresh);
    updateChart(state.historico);

    // Polling automático
    setInterval(async () => {
        await fetchData(state);
        render(state);
        bindEventListeners(state, onRefresh);
        updateChart(state.historico);
    }, CONFIG.REFRESH_MS);
}

// Registro del service worker (PWA)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('SW registro fallido:', err);
    });
}

// Iniciar aplicación
init();
