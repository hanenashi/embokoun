// embokoun Okoun DOM scanner
(function() {
    'use strict';

    const root = window.Embokoun;
    const MAX_WIDTH = '550px';

    function isInsideEmbokounNode(node) {
        if (!node || node.nodeType !== 1) return false;
        return !!node.closest('[data-embokoun-node="1"]');
    }

    function processLink(link) {
        if (!link || link.nodeType !== 1) return;
        if (link.dataset.embokounDone === '1') return;
        if (isInsideEmbokounNode(link)) return;

        const contentRoot = link.closest('div.content, .item .content');
        if (!contentRoot) return;

        const url = link.href;
        if (!url) return;

        for (const service of root.services.list) {
            if (!root.config.isServiceEnabled(service.key)) continue;
            if (typeof service.match !== 'function') continue;

            const match = service.match(url);
            if (!match) continue;

            link.dataset.embokounDone = '1';
            link.classList.add('embokoun-embedded');

            const wrapper = document.createElement('div');
            wrapper.setAttribute('data-embokoun-node', '1');
            wrapper.style.cssText = `margin:12px 0;max-width:${MAX_WIDTH};display:flex;flex-direction:column;`;

            const ctx = { match, originalUrl: url, link, service };

            if (service.lazy === false) {
                Promise.resolve(service.embed(ctx)).then(node => {
                    wrapper.insertBefore(node, wrapper.firstChild);
                }).catch(err => {
                    root.log.error(service.key, 'direct embed failed', err);
                });
            } else {
                wrapper.appendChild(root.ui.makePlaceholder(service, ctx));
            }

            wrapper.appendChild(root.ui.makeSourceLink(url, service.label));

            if (link.parentNode) {
                link.parentNode.insertBefore(wrapper, link.nextSibling);
            }

            if (link.querySelector('img')) {
                link.style.display = 'none';
            }

            root.log.info('dom', 'embedded placeholder', service.key, url);
            return;
        }
    }

    function scan(rootNode) {
        if (!rootNode || rootNode.nodeType !== 1) return;
        if (isInsideEmbokounNode(rootNode)) return;

        if (rootNode.matches && rootNode.matches('div.content a, .item .content a')) {
            processLink(rootNode);
        }

        const links = rootNode.querySelectorAll
            ? rootNode.querySelectorAll('div.content a:not([data-embokoun-done="1"]), .item .content a:not([data-embokoun-done="1"])')
            : [];

        links.forEach(processLink);
    }

    let scanTimer = null;
    const pendingRoots = new Set();

    function scheduleScan(node) {
        if (!node || node.nodeType !== 1) return;
        if (isInsideEmbokounNode(node)) return;

        pendingRoots.add(node);
        if (scanTimer) return;

        scanTimer = setTimeout(() => {
            const roots = Array.from(pendingRoots);
            pendingRoots.clear();
            scanTimer = null;
            roots.forEach(scan);
        }, 250);
    }

    function start() {
        scan(document.body);

        const observer = new MutationObserver(mutations => {
            for (const mut of mutations) {
                for (const node of mut.addedNodes) scheduleScan(node);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        root.log.info('dom', 'observer started');
    }

    root.dom = {
        start,
        scan,
        scheduleScan,
        isInsideEmbokounNode
    };
})();
