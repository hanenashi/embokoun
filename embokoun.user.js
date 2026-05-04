// ==UserScript==
// @name         embokoun
// @namespace    https://github.com/hanenashi/embokoun
// @version      0.4.11-alpha
// @description  Modular universal embedder for okoun.cz
// @author       hanenashi
// @match        *://*.okoun.cz/*
// @updateURL    https://raw.githubusercontent.com/hanenashi/embokoun/main/embokoun.user.js
// @downloadURL  https://raw.githubusercontent.com/hanenashi/embokoun/main/embokoun.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM.registerMenuCommand
// @connect      *
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/core/namespace.js
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/core/gm.js
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/core/config.js
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/core/log.js
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/core/ui.js
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/core/blob.js
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/core/shell.js
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/core/render.js
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/services/direct-mp4.js
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/services/youtube.js
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/services/vimeo.js
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/services/twitter.js
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/services/telegram.js
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/services/instagram.js
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/services/index.js
// @require      https://raw.githubusercontent.com/hanenashi/embokoun/main/src/core/dom.js
// ==/UserScript==

(function() {
    'use strict';

    const E = window.Embokoun;

    if (!E) {
        console.error('[embokoun] namespace failed to load');
        return;
    }

    E.version = '0.4.11-alpha';
    E.gm.menuCommand('Embokoun settings', () => E.ui.openSettingsMenu());

    E.log.info('boot', 'starting', E.version);
    E.dom.start();
})();
