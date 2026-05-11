// embokoun Okoun DOM scanner
(function() {
    'use strict';

    const root = window.Embokoun;
    const URL_RE = /https?:\/\/[^\s<>"']+/ig;

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

    function shouldParsePlainTextLinks() {
        return !!(root.config && root.config.get && root.config.get('parsePlainTextLinks'));
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

    function mediaMaxWidth(service) {
        if (root.config && typeof root.config.mediaMaxWidth === 'function') {
            return root.config.mediaMaxWidth(service && service.maxWidth);
        }
        return (service && service.maxWidth) || '550px';
    }

    function serviceByKey(key) {
        return root.services.list.find(service => service.key === key) || null;
    }

    function findService(url) {
        if (!url) return null;

        for (const service of root.services.list) {
            if (!root.config.isServiceEnabled(service.key)) continue;
            if (typeof service.match !== 'function') continue;

            const match = service.match(url);
            if (match) return { service, match };
        }

        return null;
    }

    function trimUrl(raw) {
        let url = String(raw || '');
        let suffix = '';

        while (/[)\].,!?;:]+$/.test(url)) {
            suffix = url.slice(-1) + suffix;
            url = url.slice(0, -1);
        }

        return { url, suffix };
    }

    function makeWrapper(url, service, match, link) {
        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-embokoun-node', '1');
        wrapper.setAttribute('data-embokoun-wrapper', '1');
        wrapper.dataset.embokounService = service.key;
        wrapper.dataset.embokounSourceUrl = url;
        wrapper.dataset.embokounServiceLabel = service.label;
        wrapper.style.cssText = `margin:12px 0;max-width:${mediaMaxWidth(service)};display:flex;flex-direction:column;`;

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
        return wrapper;
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

    function syncMediaWidth() {
        document.querySelectorAll('[data-embokoun-wrapper="1"]').forEach(wrapper => {
            const service = serviceByKey(wrapper.dataset.embokounService);
            wrapper.style.maxWidth = mediaMaxWidth(service);
        });

        document.querySelectorAll('[data-embokoun-media-frame="1"]').forEach(frame => {
            frame.style.maxWidth = mediaMaxWidth();
        });

        root.log.debug('dom', 'media width synced');
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

        const found = findService(url);
        if (!found) return;

        link.dataset.embokounDone = '1';
        link.dataset.embokounService = found.service.key;
        link.classList.add('embokoun-embedded');
        setInlineLinkVisible(link, shouldShowSourceLink());

        const wrapper = makeWrapper(url, found.service, found.match, link);

        if (link.parentNode) {
            link.parentNode.insertBefore(wrapper, link.nextSibling);
        }

        root.log.info('dom', shouldAutoLoad(found.service) ? 'auto-loading' : 'embedded placeholder', found.service.key, url);
    }

    function textNodeAccepted(node) {
        URL_RE.lastIndex = 0;
        if (!node || !URL_RE.test(node.nodeValue || '')) return false;
        URL_RE.lastIndex = 0;

        const parent = node.parentElement;
        if (!parent) return false;
        if (isInsideEmbokounNode(parent)) return false;
        if (parent.closest('a, script, style, textarea, input, button, select, option')) return false;
        if (!parent.closest('div.content, .item .content')) return false;

        return true;
    }

    function linkifyTextNode(node) {
        const text = node.nodeValue || '';
        URL_RE.lastIndex = 0;

        let match;
        let lastIndex = 0;
        let changed = false;
        const fragment = document.createDocumentFragment();

        while ((match = URL_RE.exec(text))) {
            const raw = match[0];
            const trimmed = trimUrl(raw);
            const found = findService(trimmed.url);

            if (!found) continue;

            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            }

            const link = document.createElement('a');
            link.href = trimmed.url;
            link.textContent = trimmed.url;
            fragment.appendChild(link);

            if (trimmed.suffix) {
                fragment.appendChild(document.createTextNode(trimmed.suffix));
            }

            lastIndex = match.index + raw.length;
            changed = true;
        }

        if (!changed) return;

        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        node.parentNode.replaceChild(fragment, node);
    }

    function processPlainTextLinks(rootNode) {
        if (!shouldParsePlainTextLinks()) return;
        if (!rootNode || rootNode.nodeType !== 1) return;

        const roots = [];
        if (rootNode.matches && rootNode.matches('div.content, .item .content')) roots.push(rootNode);
        if (rootNode.querySelectorAll) {
            rootNode.querySelectorAll('div.content, .item .content').forEach(content => roots.push(content));
        }

        roots.forEach(content => {
            const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    return textNodeAccepted(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            });

            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            nodes.forEach(linkifyTextNode);
        });
    }

    function scan(rootNode) {
        syncSourceVisibility();

        if (!rootNode || rootNode.nodeType !== 1) return;
        if (isInsideEmbokounNode(rootNode)) return;

        if (rootNode.matches && rootNode.matches('div.content a, .item .content a')) {
            processLink(rootNode);
        }

        processPlainTextLinks(rootNode);

        const links = rootNode.querySelectorAll
            ? rootNode.querySelectorAll('div.content a:not([data-embokoun-done="1"]), .item .content a:not([data-embokoun-done="1"])')
            : [];

        links.forEach(processLink);
        syncSourceVisibility();
        syncMediaWidth();
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
        syncMediaWidth,
        isInsideEmbokounNode
    };
})();
