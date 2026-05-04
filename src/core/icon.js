// embokoun icon wiring
(function() {
    'use strict';

    const root = window.Embokoun;
    if (!root || !root.ui || !root.ui.openSettingsMenu) return;

    const originalOpenSettingsMenu = root.ui.openSettingsMenu;

    function injectSettingsIcon() {
        const menu = document.querySelector('.embokoun-settings-menu');
        if (!menu || menu.querySelector('[data-embokoun-settings-icon="1"]')) return;

        const hero = document.createElement('div');
        hero.setAttribute('data-embokoun-settings-icon', '1');
        hero.style.cssText = [
            'display:flex;',
            'align-items:center;',
            'gap:10px;',
            'margin:0 0 10px;',
            'padding:8px;',
            'border:1px solid rgba(255,216,106,0.22);',
            'border-radius:9px;',
            'background:linear-gradient(135deg, rgba(255,216,106,0.10), rgba(80,70,120,0.08));'
        ].join('');

        const img = document.createElement('img');
        img.src = root.iconUrl || 'https://raw.githubusercontent.com/hanenashi/embokoun/main/embokoun.png';
        img.alt = 'embokoun';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.style.cssText = [
            'width:46px;',
            'height:46px;',
            'object-fit:contain;',
            'border-radius:8px;',
            'background:#050507;',
            'box-shadow:0 0 12px rgba(255,200,70,0.22);',
            'flex:0 0 auto;'
        ].join('');

        const text = document.createElement('div');
        text.style.cssText = 'min-width:0;display:flex;flex-direction:column;gap:2px;';

        const name = document.createElement('div');
        name.textContent = 'embokoun';
        name.style.cssText = 'font-weight:bold;color:#f0d071;font-size:14px;line-height:1.1;';

        const tag = document.createElement('div');
        tag.textContent = 'obsidian media shrine';
        tag.style.cssText = 'color:#999;font-size:10px;line-height:1.2;';

        text.appendChild(name);
        text.appendChild(tag);
        hero.appendChild(img);
        hero.appendChild(text);

        const title = menu.firstElementChild;
        if (title && title.nextSibling) menu.insertBefore(hero, title.nextSibling);
        else menu.insertBefore(hero, menu.firstChild);
    }

    root.ui.openSettingsMenu = function(anchor) {
        const result = originalOpenSettingsMenu.call(root.ui, anchor);
        injectSettingsIcon();
        return result;
    };
})();
