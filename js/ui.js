import { CONFIG } from './config.js';
import {
    getAlerta, calcTendencia, calcVariacion,
    formatVentana, maxVentanaDisponible,
    isStale, formatDateTime
} from './utils.js';

var paypalRendered = false;

export function render(state) {
    var root = document.getElementById('app');

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

    var v = state.ventana;
    var alerta = getAlerta(state.nivel);
    var tendencia = calcTendencia(state.historico, v);
    var variacion = calcVariacion(state.historico, v);
    var stale = isStale(state.timestamp);
    var badgeClass = state.status === 'error' ? 'error' : '';
    var maxV = maxVentanaDisponible(state.historico);
    if (v > maxV) {
        state.ventana = maxV;
        v = maxV;
    }
    var sliderDisabled = state.historico.length < CONFIG.MIN_WINDOW + 1;

    var html = '';

    html += '<div class="header">';
    html += '<h1>Rio Genil - Ecija</h1>';
    html += '<p class="header-sub">Estacion A17 - SAIH Guadalquivir</p>';
    html += '<span class="live-badge ' + badgeClass + '">';
    html += '<span class="live-dot"></span>';
    html += (state.status === 'error' ? 'SIN DATOS' : 'EN VIVO');
    html += '</span>';
    html += '</div>';

    if (state.status === 'error') {
        html += '<div class="error-box">';
        html += '<strong style="font-size:1.1em">Error de conexion</strong>';
        html += '<p>No se pudieron obtener los datos del SAIH. El scraper puede estar caido o el archivo datos.json no esta disponible.</p>';
        html += '</div>';
    }

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

    if (state.status === 'ok') {
        html += '<div class="card">';

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
        html += '<div class="extra-value" id="val-window">' + formatVentana(v) + '</div>';
        html += '</div>';

        html += '</div>';

        html += '<div class="slider-wrap">';
        html += '<div class="slider-header">';
        html += '<span class="slider-title">Ventana de analisis</span>';
        html += '<span class="slider-window" id="slider-badge">' + formatVentana(v) + '</span>';
        html += '</div>';
        html += '<div class="slider-track">';
        html += '<input type="range" class="slider-input" id="slider-ventana"';
        html += ' min="' + CONFIG.MIN_WINDOW + '" max="' + maxV + '" value="' + v + '"';
        html += ' step="1"' + (sliderDisabled ? ' disabled' : '') + '>';
        html += '</div>';
        html += '<div class="slider-labels">';
        html += '<span>' + formatVentana(CONFIG.MIN_WINDOW) + '</span>';
        html += '<span>' + formatVentana(maxV) + '</span>';
        html += '</div>';
        html += '</div>';

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

    html += '<div class="card chart-wrap">';
    html += '<div class="chart-title">Evolucion temporal (ultimas ' + state.historico.length + ' lecturas)</div>';
    if (state.historico.length > 1) {
        html += '<div style="height:220px"><canvas id="chart-canvas"></canvas></div>';
    } else {
        html += '<div class="chart-empty">Esperando mas lecturas para mostrar la grafica...</div>';
    }
    html += '</div>';

    html += '<button class="btn-refresh" id="btn-refresh"' + (state.refreshing ? ' disabled' : '') + '>';
    html += state.refreshing ? 'Verificando...' : 'Actualizar datos';
    html += '</button>';

    html += '<div class="disclaimer">';
    html += '<div class="disclaimer-title">Aviso importante</div>';
    html += 'Esta pagina NO es una fuente oficial. Los datos se obtienen mediante lectura automatizada de la web del SAIH Guadalquivir y pueden contener errores, retrasos o interrupciones sin previo aviso. ';
    html += 'Este monitor no sustituye a los sistemas oficiales de alerta. Ante cualquier situacion de riesgo, consulte siempre a <strong style="color:var(--text-main)">Proteccion Civil (112)</strong> o la <strong style="color:var(--text-main)">Confederacion Hidrografica del Guadalquivir</strong>. ';
    html += 'El autor no se hace responsable de decisiones tomadas en base a la informacion aqui mostrada.';
    html += '</div>';

    html += '<div class="card donate-card">';
    html += '<div class="donate-title">Apoya este proyecto</div>';
    html += '<p class="donate-text">Si este monitor te ha resultado util y quieres ayudarme con los costes de mantenimiento y mejora del sistema</p>';
    html += '<div id="donate-button-container">';
    html += '<div id="donate-button"></div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="footer">';
    html += 'Datos: <a href="https://www.chguadalquivir.es/saih" target="_blank" rel="noopener">SAIH - Confederacion Hidrografica del Guadalquivir</a>';
    html += '<br>Actualizacion automatica via GitHub Actions cada 15 min';
    html += '</div>';

    root.innerHTML = html;

    renderPayPal();
}

function renderPayPal() {
    if (paypalRendered) return;
    if (typeof PayPal === 'undefined' || !PayPal.Donation) return;

    var container = document.getElementById('donate-button');
    if (!container) return;

    PayPal.Donation.Button({
        env: 'production',
        hosted_button_id: 'ZJ7867PTZQNU2',
        image: {
            src: 'https://www.paypalobjects.com/es_ES/ES/i/btn/btn_donateCC_LG.gif',
            alt: 'Donar con PayPal',
            title: 'PayPal'
        }
    }).render('#donate-button');

    paypalRendered = true;
}

function onSliderChange(state, value) {
    state.ventana = value;

    var tendencia = calcTendencia(state.historico, value);
    var variacion = calcVariacion(state.historico, value);

    var elTendencia = document.getElementById('val-tendencia');
    var elVariacion = document.getElementById('val-variacion');
    var elWindow = document.getElementById('val-window');
    var elBadge = document.getElementById('slider-badge');

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
    var root = document.getElementById('app');

    root.addEventListener('click', function (e) {
        var btn = e.target.closest('#btn-refresh');
        if (btn && !btn.disabled) {
            onRefresh();
        }
    });

    root.addEventListener('input', function (e) {
        if (e.target.id === 'slider-ventana') {
            onSliderChange(state, parseInt(e.target.value, 10));
        }
    });
}