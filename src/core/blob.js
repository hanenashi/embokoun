// embokoun blob downloader core
(function() {
    'use strict';

    const root = window.Embokoun;
    const DEFAULT_TIMEOUT = 30000;
    const DEFAULT_MAX_BYTES = 80 * 1024 * 1024;
    const active = [];

    function formatBytes(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) return '? MB';
        const mb = bytes / 1024 / 1024;
        return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
    }

    function getHeader(headers, name) {
        const wanted = String(name).toLowerCase();
        for (const line of String(headers || '').split(/\r?\n/)) {
            const idx = line.indexOf(':');
            if (idx === -1) continue;
            if (line.slice(0, idx).trim().toLowerCase() === wanted) {
                return line.slice(idx + 1).trim();
            }
        }
        return null;
    }

    function download(url, options) {
        options = options || {};

        const referer = options.referer || url;
        const timeout = options.timeout || DEFAULT_TIMEOUT;
        const maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;
        const area = options.area || 'blob';

        let req = null;
        let aborted = false;
        let settled = false;

        const promise = new Promise((resolve, reject) => {
            const fail = (err) => {
                if (settled) return;
                settled = true;
                reject(err);
            };

            try {
                req = root.gm.request({
                    method: 'GET',
                    url,
                    timeout,
                    responseType: 'blob',
                    headers: {
                        'Accept': 'video/mp4,video/*,*/*',
                        'Referer': referer
                    },
                    onprogress: (ev) => {
                        if (aborted || settled) return;

                        const loaded = ev && Number.isFinite(ev.loaded) ? ev.loaded : 0;
                        const total = ev && ev.lengthComputable && Number.isFinite(ev.total) ? ev.total : 0;

                        if (maxBytes && (loaded > maxBytes || total > maxBytes)) {
                            aborted = true;
                            if (req && typeof req.abort === 'function') req.abort();
                            fail(new Error(`Blob too large (${formatBytes(Math.max(loaded, total))})`));
                            return;
                        }

                        if (typeof options.onProgress === 'function') {
                            options.onProgress({ loaded, total });
                        }
                    },
                    onload: (res) => {
                        if (aborted || settled) return;

                        if (res.status < 200 || res.status >= 300) {
                            fail(new Error(`Blob HTTP ${res.status}`));
                            return;
                        }

                        const contentLength = Number(getHeader(res.responseHeaders, 'content-length'));
                        if (maxBytes && Number.isFinite(contentLength) && contentLength > maxBytes) {
                            fail(new Error(`Blob too large (${formatBytes(contentLength)})`));
                            return;
                        }

                        if (!res.response || !res.response.size) {
                            fail(new Error('Empty blob'));
                            return;
                        }

                        if (maxBytes && res.response.size > maxBytes) {
                            fail(new Error(`Blob too large (${formatBytes(res.response.size)})`));
                            return;
                        }

                        const blobUrl = URL.createObjectURL(res.response);
                        settled = true;
                        root.log.debug(area, 'blob created', url, formatBytes(res.response.size));
                        resolve({ blobUrl, size: res.response.size });
                    },
                    onerror: () => {
                        if (!aborted) fail(new Error('Blob request failed'));
                    },
                    ontimeout: () => {
                        if (!aborted) fail(new Error('Blob request timeout'));
                    }
                });
            } catch (e) {
                fail(e);
            }
        });

        return {
            promise,
            abort() {
                if (settled || aborted) return;
                aborted = true;
                if (req && typeof req.abort === 'function') req.abort();
            }
        };
    }

    function track(record) {
        active.push(record);
        cleanup();
    }

    function cleanup() {
        while (active.length > 3) {
            const old = active.shift();
            if (old && typeof old.unload === 'function') old.unload();
        }
    }

    function makeVideoFromBlob(blobUrl, service, restore) {
        const video = document.createElement('video');
        video.setAttribute('data-embokoun-node', '1');
        video.src = blobUrl;
        video.controls = true;
        video.autoplay = true;
        video.preload = 'metadata';
        video.playsInline = true;
        video.style.cssText = [
            'width:100%;',
            service.style || 'aspect-ratio:16/9;background:#000;',
            'border-radius:4px;',
            'box-shadow:0 2px 8px rgba(0,0,0,0.2);',
            'background:#000;'
        ].join('');

        let unloaded = false;
        const record = {
            unload(pageLeaving) {
                if (unloaded) return;
                unloaded = true;
                try { video.pause(); } catch (e) { /* ignore */ }
                video.removeAttribute('src');
                try { video.load(); } catch (e) { /* ignore */ }
                URL.revokeObjectURL(blobUrl);
                const idx = active.indexOf(record);
                if (idx !== -1) active.splice(idx, 1);
                if (!pageLeaving && video.isConnected && typeof restore === 'function') {
                    video.replaceWith(restore());
                }
            }
        };

        track(record);
        return video;
    }

    function revokeAll() {
        while (active.length) {
            const item = active.shift();
            if (item && typeof item.unload === 'function') item.unload(true);
        }
    }

    window.addEventListener('pagehide', revokeAll, { once: true });
    window.addEventListener('beforeunload', revokeAll, { once: true });

    root.blob = {
        download,
        makeVideoFromBlob,
        formatBytes,
        revokeAll
    };
})();
