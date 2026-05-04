// embokoun Okoun DOM scanner
(function() {
    'use strict';

    const root = window.Embokoun;
    const MAX_WIDTH = '550px';

    function isInsideEmbokounNode(node) {
        if (!node || node.nodeType !== 1) return false;
        return !!node.closest('[data-embokoun-node="1"]');
    }

    function shouldAutoLoad(service) {
        if (!service) return false;
        if (service.lazy === false) return true;
        return !!(root.config && root.config.isServiceAutoLoad && root.config.isServiceAutoLoad(service.key));
    }

    function shouldShowSourceLink() {
        return !!(root.config && root.config.get && root.config.get('showSourceLinks'));
    }

    function rememberDisplay(el) {
        if (!el || el.dataset.embokounOrigDisplay !== undefined) return;
        el.dataset.embokounOrigDisplay = el.style.display || '';
    }

    function setInlineLinkVisible(link, visible) {
        if (!link) return;
        rememberDisplay(link);
        link.style.display = visible ? (link.dataset.embokounOrigDisplay || '') : 'none';
    }

    function makeTrackedSourceLink(url, serviceLabel) {
        const source = root.ui.makeSourceLink(url, serviceLabel);
        source.setAttribute('data-embokoun-source-link', '1');
        source.style.display = shouldShowSourceLink() ? '' : 'none';
        return source;
    }

    function ensureWrapperSourceLink(wrapper) {
        if (!wrapper || !wrapper.dataset) return;
        if (wrapper.querySelector('[data-embokoun-source-link="1"]')) return;
        const url = wrapper.dataset.embokounSourceUrl;
        const label = wrapper.dataset.embokounServiceLabel || 'original';
        if (!url) return;
        wrapper.appendChild(makeTrackedSourceLink(url, label));
    }

    function syncSourceVisibility() {
        const show = shouldShowSourceLink();

        document.querySelectorAll('a.embokoun-embedded[data-embokoun-done="1"]').forEach(link => {
            setInlineLinkVisible(link, show);
        });

        document.querySelectorAll('[data-embokoun-wrapper="1"]').forEach(wrapper => {
            ensureWrapperSourceLink(wrapper);
            wrapper.querySelectorAll('[data-embokoun-source-link="1"]').forEach(source => {
                source.style.display = show ? '' : 'none';
            });
        });

        root.log.debug('dom', 'source visibility synced', `show=${show}`);
    }

    function processLink(link) {
        if (!link || link.nodeType !== 1) return;
        if (link.dataset.embokounDone === '1') {
            syncSourceVisibility();
            return;
        }
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
            link.dataset.embokounService = service.key;
            link.classList.add('embokoun-embedded');
            setInlineLinkVisible(link, shouldShowSourceLink());

            const wrapper = document.createElement('div');
            wrapper.setAttribute('data-embokoun-node', '1');
            wrapper.setAttribute('data-embokoun-wrapper', '1');
            wrapper.dataset.embokounSourceUrl = url;
            wrapper.dataset.embokounServiceLabel = service.label;
            wrapper.style.cssText = `margin:12px 0;max-width:${service.maxWidth || MAX_WIDTH};display:flex;flex-direction:column;`;

            const ctx = { match, originalUrl: url, link, service };

            if (shouldAutoLoad(service)) {
                root.render.embed(ctx).then(node => {
                    wrapper.insertBefore(node, wrapper.firstChild);
                }).catch(err => {
                    root.log.error(service.key, 'direct embed failed', err);
                    if (service.fallback) wrapper.insertBefore(service.fallback(ctx), wrapper.firstChild);
                });
            } else {
                wrapper.appendChild(root.ui.makePlaceholder(service, ctx));
            }

            wrapper.appendChild(makeTrackedSourceLink(url, service.label));

            if (link.parentNode) {
                link.parentNode.insertBefore(wrapper, link.nextSibling);
            }

            root.log.info('dom', shouldAutoLoad(service) ? 'auto-loading' : 'embedded placeholder', service.key, url);
            return;
        }
    }

    function scan(rootNode) {
        syncSourceVisibility();

        if (!rootNode || rootNode.nodeType !== 1) return;
        if (isInsideEmbokounNode(rootNode)) return;

        if (rootNode.matches && rootNode.matches('div.content a, .item .content a')) {
            processLink(rootNode);
        }

        const links = rootNode.querySelectorAll
            ? rootNode.querySelectorAll('div.content a:not([data-embokoun-done="1"]), .item .content a:not([data-embokoun-done="1"])')
            : [];

        links.forEach(processLink);
        syncSourceVisibility();
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
        syncSourceVisibility,
        isInsideEmbokounNode
    };
})();
