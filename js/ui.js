import { CONFIG } from './config.js';
import { getAlerta, calcTendencia, calcVariacion, formatVentana, maxVentanaDisponible, isStale, formatDateTime } from './utils.js';
import { createChart, updateChart, resetChart } from './chart.js';

export function render(state) {
    const root = document.getElementById('app');

    if (state.status === 'loading') {
        root.innerHTML =
            '<div class="header">' +
            '<h1>Rio Genil - Ecija</h1>' +
            '<p class="header-sub">Estacion A17 - SAIH Guadalquivir</p>' +
            '</div>' +
            '<div class="loading-screen">' +
            '<div class="spinner"></div>' +
            '<div style="color:var(--text-muted)">Cargando datos...</div>' +
            '</div>';
        return;
    }

    const v = state.ventana;
    const alerta = getAlerta(state.nivel);
    const tendencia = calcTendencia(state.historico, v);
    const variacion = calcVariacion(state.historico, v);
    const stale = isStale(state.timestamp);
    const badgeClass = state.status === 'error' ? 'error' : '';
    const maxV = maxVentanaDisponible(state.historico);
    if (v > maxV) {
        state.ventana = maxV;
    }
    const sliderDisabled = state.historico.length < CONFIG.MIN_WINDOW + 1;

    let html = '';

    // Header
    html += '<div class="header">';
    html += '<h1>Rio Genil - Ecija</h1>';
    html += '<p class="header-sub">Estacion A17 - SAIH Guadalquivir</p>';
    html += '<span class="live-badge ' + badgeClass + '">';
    html += '<span class="live-dot"></span>';
    html += (state.status === 'error' ? 'SIN DATOS' : 'EN VIVO');
    html += '</span>';
    html += '</div>';

    // Error
    if (state.status === 'error') {
        html += '<div class="error-box">';
        html += '<strong style="font-size:1.1em">Error de conexion</strong>';
        html += '<p>No se pudieron obtener los datos del SAIH. El scraper puede estar caido o el archivo datos.json no esta disponible.</p>';
        html += '</div>';
    }

    // Nivel principal
    if (state.status === 'ok') {
        html += '<div class="card">';
        html += '<div class="card-glow glow-' + alerta.key + '"></div>';
        html += '<div class="nivel-label">Altura del agua</div>';
        html += '<div class="nivel-valor c-' + alerta.key + '">';
        html += state.nivel.toFixed(2);
        html += '<span class="nivel-unidad">m</span>';
        html += '</div>';
        html += '<div class="alert-pill pill-' + alerta.key + '">' + alerta.texto + '</div>';
        if (stale) {
            html += '<div class="dato-stale">Dato antiguo - ultima lectura: ' + formatDateTime(state.timestamp) + '</div>';
        }
        html += '</div>';
    }

    // Datos secundarios
    if (state.status === 'ok') {
        html += '<div class="card">';

        // Caudal + ultima lectura
        html += '<div class="data-grid">';
        html += '<div class="data-box">';
        html += '<div class="data-box-label">Caudal</div>';
        html += '<div class="data-box-value" style="color:#60a5fa">';
        html += (state.caudal > 0 ? state.caudal.toFixed(1) + '<span class="data-box-unit">m3/s</span>' : '<span style="color:var(--text-muted);font-size:0.7em">No disponible</span>');
        html += '</div></div>';

        html += '<div class="data-box">';
        html += '<div class="data-box-label">Ultima lectura</div>';
        html += '<div class="data-box-value" style="font-size:1.1em">';
        html += formatDateTime(state.timestamp);
        html += '</div></div>';
        html += '</div>';

        // Tendencia + variacion + ventana
        html += '<div class="extra-row">';

        html += '<div class="extra-item">';
        html += '<div class="extra-label">Tendencia</div>';
        html += '<div class="extra-value" id="val-tendencia" style="color:' + tendencia.color + '">' + tendencia.texto + '</div>';
        html += '</div>';

        html += '<div class="extra-item">';
        html += '<div class="extra-label">Variacion</div>';
        html += '<div class="extra-value" id="val-variacion">' + variacion + '</div>';
        html += '</div>';

        html += '<div class="extra-item">';
        html += '<div class="extra-label">Ventana</div>';
        html += '<div class="extra-value" id="val-window">' + formatVentana(state.ventana) + '</div>';
        html += '</div>';

        html += '</div>';

        // Slider
        html += '<div class="slider-wrap">';
        html += '<div class="slider-header">';
        html += '<span class="slider-title">Ventana de analisis</span>';
        html += '<span class="slider-window" id="slider-badge">' + formatVentana(state.ventana) + '</span>';
        html += '</div>';
        html += '<div class="slider-track">';
        html += '<input type="range" class="slider-input" id="slider-ventana"';
        html += ' min="' + CONFIG.MIN_WINDOW + '" max="' + maxV + '" value="' + state.ventana + '"';
        html += ' step="1"' + (sliderDisabled ? ' disabled' : '') + '>';
        html += '</div>';
        html += '<div class="slider-labels">';
        html += '<span>' + formatVentana(CONFIG.MIN_WINDOW) + '</span>';
        html += '<span>' + formatVentana(maxV) + '</span>';
        html += '</div>';
        html += '</div>';

        // Umbrales
        html += '<div class="thresholds">';
        html += '<div class="thresholds-title">Umbrales de alerta</div>';
        html += '<div class="th-row th-verde"><span>Normal</span><strong>&lt; ' + CONFIG.UMBRALES.amarillo + ' m</strong></div>';
        html += '<div class="th-row th-amarillo"><span>Precaucion</span><strong>' + CONFIG.UMBRALES.amarillo + ' - ' + CONFIG.UMBRALES.naranja + ' m</strong></div>';
        html += '<div class="th-row th-naranja"><span>Alerta</span><strong>' + CONFIG.UMBRALES.naranja + ' - ' + CONFIG.UMBRALES.rojo + ' m</strong></div>';
        html += '<div class="th-row th-rojo"><span>Emergencia</span><strong>' + CONFIG.UMBRALES.rojo + ' - ' + CONFIG.UMBRALES.critico + ' m</strong></div>';
        html += '<div class="th-row th-critico"><span>Critico</span><strong>&gt; ' + CONFIG.UMBRALES.critico + ' m</strong></div>';
        html += '</div>';

        html += '</div>';
    }

    // Chart
    html += '<div class="card chart-wrap">';
    html += '<div class="chart-title">Evolucion temporal (ultimas ' + state.historico.length + ' lecturas)</div>';
    if (state.historico.length > 1) {
        html += '<div style="height:220px"><canvas id="chart-canvas"></canvas></div>';
    } else {
        html += '<div class="chart-empty">Esperando mas lecturas para mostrar la grafica...</div>';
    }
    html += '</div>';

    // Boton
    html += '<button class="btn-refresh" id="btn-refresh"' + (state.refreshing ? ' disabled' : '') + '>';
    html += state.refreshing ? 'Verificando...' : 'Actualizar datos';
    html += '</button>';

    // Disclaimer
    html += '<div class="disclaimer">';
    html += '<div class="disclaimer-title">Aviso importante</div>';
    html += 'Esta pagina NO es una fuente oficial. Los datos se obtienen mediante lectura automatizada de la web del SAIH Guadalquivir y pueden contener errores, retrasos o interrupciones sin previo aviso. ';
    html += 'Este monitor no sustituye a los sistemas oficiales de alerta. Ante cualquier situacion de riesgo, consulte siempre a <strong style="color:var(--text-main)">Proteccion Civil (112)</strong> o la <strong style="color:var(--text-main)">Confederacion Hidrografica del Guadalquivir</strong>. ';
    html += 'El autor no se hace responsable de decisiones tomadas en base a la informacion aqui mostrada.';
    html += '</div>';

    // Donativo PayPal
    html += '<div class="card donate-card">';
    html += '<div class="donate-title">Apoya este proyecto</div>';
    html += '<p class="donate-text">Si este monitor te resulta util, considera hacer una donacion para mantener el proyecto activo.</p>';
    html += '<div id="donate-button-container">';
    html += '<div id="donate-button"></div>';
    html += '</div>';
    html += '</div>';

    // Footer
    html += '<div class="footer">';
    html += 'Datos: <a href="https://www.chguadalquivir.es/saih" target="_blank" rel="noopener">SAIH - Confederacion Hidrografica del Guadalquivir</a>';
    html += '<br>Actualizacion automatica via GitHub Actions cada 15 min';
    html += '</div>';

    root.innerHTML = html;

    // Inicializar botón PayPal después de que el DOM esté listo
    if (typeof PayPal !== 'undefined' && PayPal.Donation) {
        PayPal.Donation.Button({
            env: 'production',
            hosted_button_id: 'ZJ7867PTZQNU2',
            image: {
                src: 'https://www.paypalobjects.com/es_ES/ES/i/btn/btn_donateCC_LG.gif',
                alt: 'Botón Donar con PayPal',
                title: 'PayPal - The safer, easier way to pay online!',
            }
        }).render('#donate-button');
    }

    // Chart
    if (state.historico.length > 1) {
        const canvas = document.getElementById('chart-canvas');
        if (canvas) {
            resetChart();
            createChart(canvas, state.historico);
        }
    }
}

export function onSliderChange(state, value) {
    state.ventana = value;

    const tendencia = calcTendencia(state.historico, value);
    const variacion = calcVariacion(state.historico, value);

    const elTendencia = document.getElementById('val-tendencia');
    const elVariacion = document.getElementById('val-variacion');
    const elWindow = document.getElementById('val-window');
    const elBadge = document.getElementById('slider-badge');

    if (elTendencia) {
        elTendencia.textContent = tendencia.texto;
        elTendencia.style.color = tendencia.color;
    }
    if (elVariacion) {
        elVariacion.textContent = variacion;
    }
    if (elWindow) {
        elWindow.textContent = formatVentana(value);
    }
    if (elBadge) {
        elBadge.textContent = formatVentana(value);
    }
}

export function bindEventListeners(state, onRefresh) {
    const btn = document.getElementById('btn-refresh');
    if (btn) {
        btn.addEventListener('click', onRefresh);
    }

    const slider = document.getElementById('slider-ventana');
    if (slider) {
        slider.addEventListener('input', (e) => {
            onSliderChange(state, parseInt(e.target.value, 10));
        });
    }
}
