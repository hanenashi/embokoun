// embokoun loaded media shell
(function() {
    'use strict';

    const root = window.Embokoun;

    function cleanupNode(node) {
        if (!node) return;

        const videos = [];
        if (node.matches && node.matches('video')) videos.push(node);
        if (node.querySelectorAll) node.querySelectorAll('video').forEach(video => videos.push(video));

        videos.forEach(video => {
            try { video.pause(); } catch (e) { /* ignore */ }

            if (typeof video.embokounUnload === 'function') {
                try { video.embokounUnload(); } catch (e) { /* ignore */ }
                return;
            }

            try {
                video.removeAttribute('src');
                video.load();
            } catch (e) {
                // ignore
            }
        });
    }

    function smallTool(text) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.style.cssText = [
            'font:10px/1 sans-serif;',
            'padding:4px 6px;',
            'border-radius:999px;',
            'border:1px solid rgba(255,255,255,0.25);',
            'background:rgba(0,0,0,0.62);',
            'color:#ddd;',
            'cursor:pointer;',
            'opacity:0.78;'
        ].join('');
        return button;
    }

    function wrapLoadedNode(node, ctx) {
        if (!node || !ctx || !ctx.service) return node;
        if (node.dataset && node.dataset.embokounShell === '1') return node;

        const shell = document.createElement('div');
        shell.setAttribute('data-embokoun-node', '1');
        shell.dataset.embokounShell = '1';
        shell.style.cssText = [
            'position:relative;',
            'display:block;',
            'width:100%;',
            'max-width:100%;'
        ].join('');

        const toolbar = document.createElement('div');
        toolbar.setAttribute('data-embokoun-node', '1');
        toolbar.style.cssText = [
            'position:absolute;',
            'top:6px;',
            'right:6px;',
            'z-index:20;',
            'display:flex;',
            'gap:5px;',
            'align-items:center;'
        ].join('');

        const hide = smallTool('hide');
        hide.title = 'Restore placeholder';
        hide.addEventListener('click', ev => {
            ev.preventDefault();
            ev.stopPropagation();
            cleanupNode(shell);
            if (shell.isConnected && root.ui && root.ui.makePlaceholder) {
                shell.replaceWith(root.ui.makePlaceholder(ctx.service, ctx));
            }
        });

        const settings = root.ui && root.ui.makeSettingsButton
            ? root.ui.makeSettingsButton()
            : smallTool('settings');
        settings.style.position = 'static';
        settings.style.top = '';
        settings.style.right = '';

        toolbar.appendChild(hide);
        toolbar.appendChild(settings);
        shell.appendChild(toolbar);
        shell.appendChild(node);

        return shell;
    }

    root.ui = root.ui || {};
    root.ui.wrapLoadedNode = wrapLoadedNode;
})();
