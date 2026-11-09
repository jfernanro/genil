import { CONFIG } from './config.js';

export function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function toggleTheme() {
    var next = getTheme() === 'light' ? 'dark' : 'light';
    if (next === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    try {
        localStorage.setItem(CONFIG.THEME_KEY, next);
    } catch (e) { }
    return next;
}

export function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
