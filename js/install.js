import { CONFIG } from './config.js';

var deferredPrompt = null;
var pendingTimer = null;
// Se incrementa en cada show/hide para invalidar rAF y finales de transición anteriores
var visibilityToken = 0;
var HORA_MS = 3600000;

var SHARE_ICON = '<svg class="install-share-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M8 10H6v11h12V10h-2"/><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/></svg>';

var CLOSE_BTN = '<button type="button" class="install-close" data-action="close" aria-label="Cerrar">&times;</button>';

// Se registra al evaluar el módulo: init() hace await de red y el evento podría llegar antes
window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    scheduleShow('prompt');
});

window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    hide();
});

function getBanner() {
    return document.getElementById('install-banner');
}

function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function isIos() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function wasDismissedRecently() {
    try {
        var valor = Number(localStorage.getItem(CONFIG.INSTALL_KEY));
        if (!valor) return false;
        return Date.now() - valor < CONFIG.INSTALL_REPROMPT_HORAS * HORA_MS;
    } catch (e) {
        return false;
    }
}

function markDismissed() {
    try {
        localStorage.setItem(CONFIG.INSTALL_KEY, String(Date.now()));
    } catch (e) { }
}

function scheduleShow(mode) {
    if (isStandalone() || wasDismissedRecently()) return;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(show, CONFIG.INSTALL_DELAY_MS, mode);
}

function bannerHtml(mode) {
    if (mode === 'prompt') {
        return '<p class="install-text">Instala Río Genil para consultarlo como una app.</p>' +
            '<button type="button" class="install-btn" data-action="install">Instalar</button>' +
            CLOSE_BTN;
    }
    return '<p class="install-text">Para instalarla: pulsa Compartir ' + SHARE_ICON +
        ' y después «Añadir a pantalla de inicio».</p>' +
        CLOSE_BTN;
}

function show(mode) {
    pendingTimer = null;
    var banner = getBanner();
    if (!banner) return;
    if (mode === 'prompt' && !deferredPrompt) return;
    if (isStandalone()) return;

    var token = ++visibilityToken;
    banner.innerHTML = bannerHtml(mode);
    banner.hidden = false;
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            if (token !== visibilityToken) return;
            banner.classList.add('is-visible');
        });
    });
}

function hide() {
    if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
    }
    var banner = getBanner();
    if (!banner || banner.hidden) return;

    var token = ++visibilityToken;
    banner.classList.remove('is-visible');
    if (prefersReducedMotion()) {
        banner.hidden = true;
        return;
    }

    var done = false;
    function finish(e) {
        if (done || (e && e.target !== banner)) return;
        done = true;
        banner.removeEventListener('transitionend', finish);
        if (token === visibilityToken) {
            banner.hidden = true;
        }
    }
    banner.addEventListener('transitionend', finish);
    setTimeout(finish, 400);
}

function onClick(e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');

    if (action === 'install') {
        var promptEvent = deferredPrompt;
        deferredPrompt = null;
        if (promptEvent) {
            promptEvent.prompt();
            promptEvent.userChoice.then(function (choice) {
                if (choice && choice.outcome === 'dismissed') {
                    markDismissed();
                }
            }).catch(function () { });
        }
        hide();
    } else if (action === 'close') {
        markDismissed();
        hide();
    }
}

export function initInstall() {
    var banner = getBanner();
    if (banner) {
        banner.addEventListener('click', onClick);
    }
    if (isIos()) {
        scheduleShow('ios');
    }
}
