// embokoun universal render core
(function() {
    'use strict';

    const root = window.Embokoun;

    function aspectStyle(aspect) {
        if (!aspect) return 'aspect-ratio:16/9;';
        return `aspect-ratio:${String(aspect).replace(':', '/')};`;
    }

    function maxWidthForMode(mode) {
        if ((!mode || mode === 'normal' || mode === 'tall') && root.config && typeof root.config.mediaMaxWidth === 'function') {
            return root.config.mediaMaxWidth();
        }
        if (mode === 'wide') return '760px';
        if (mode === 'full') return '100%';
        return '550px';
    }

    function shell(node, ctx) {
        if (root.ui && typeof root.ui.wrapLoadedNode === 'function') {
            return root.ui.wrapLoadedNode(node, ctx);
        }
        return node;
    }

    function makeVideo(url, result) {
        const video = document.createElement('video');
        video.setAttribute('data-embokoun-node', '1');
        video.src = url;
        video.controls = true;
        video.autoplay = !!result.autoplay;
        video.preload = result.preload || 'metadata';
        video.playsInline = true;
        video.style.cssText = [
            'width:100%;',
            result.style || `${aspectStyle(result.aspect)}background:#000;`,
            'border-radius:4px;',
            'box-shadow:0 2px 8px rgba(0,0,0,0.2);',
            'background:#000;'
        ].join('');
        return video;
    }

    function makeStreamingVideo(url, result, ctx) {
        const video = makeVideo(url, result);
        const wrap = document.createElement('div');
        wrap.setAttribute('data-embokoun-node', '1');
        wrap.style.cssText = 'position:relative;width:100%;background:#000;border-radius:4px;';

        const status = document.createElement('div');
        status.setAttribute('data-embokoun-node', '1');
        status.style.cssText = [
            'position:absolute;',
            'left:8px;',
            'top:8px;',
            'z-index:6;',
            'max-width:calc(100% - 16px);',
            'box-sizing:border-box;',
            'padding:5px 8px;',
            'border-radius:999px;',
            'background:rgba(0,0,0,0.68);',
            'color:#eee;',
            'font:11px/1.25 sans-serif;',
            'text-shadow:0 1px 1px #000;',
            'pointer-events:none;'
        ].join('');

        function setStatus(text) {
            status.textContent = text;
            status.style.display = text ? '' : 'none';
        }

        function bufferedPercent() {
            if (!Number.isFinite(video.duration) || video.duration <= 0 || !video.buffered.length) return 0;
            const end = video.buffered.end(video.buffered.length - 1);
            return Math.max(0, Math.min(100, Math.round((end / video.duration) * 100)));
        }

        function setBufferedStatus(prefix) {
            const percent = bufferedPercent();
            if (percent >= 100 || video.readyState >= 3) {
                setStatus('');
                return;
            }
            setStatus(percent ? `${prefix} ${percent}%` : prefix);
        }

        setStatus(result.statusText || `Loading ${ctx.service.label}...`);

        video.addEventListener('loadstart', () => setStatus(`Opening ${ctx.service.label}...`));
        video.addEventListener('loadedmetadata', () => setStatus(video.paused ? 'Ready to play' : 'Starting...'));
        video.addEventListener('progress', () => setBufferedStatus('Buffered'));
        video.addEventListener('waiting', () => setBufferedStatus('Buffering...'));
        video.addEventListener('stalled', () => setStatus('Network stalled. Waiting for video...'));
        video.addEventListener('canplay', () => setStatus(''));
        video.addEventListener('canplaythrough', () => setStatus(''));
        video.addEventListener('playing', () => setStatus(''));
        video.addEventListener('pause', () => setStatus(''));
        video.addEventListener('ended', () => setStatus(''));
        video.addEventListener('error', () => setStatus(`${ctx.service.label} failed to load`));

        wrap.appendChild(video);
        wrap.appendChild(status);
        return wrap;
    }

    function makeImage(url, result) {
        const img = document.createElement('img');
        img.setAttribute('data-embokoun-node', '1');
        img.src = url;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.style.cssText = [
            'display:block;',
            'max-width:100%;',
            'height:auto;',
            'border-radius:4px;',
            'box-shadow:0 2px 8px rgba(0,0,0,0.2);',
            result.style || ''
        ].join('');
        return img;
    }

    function fallbackFrame(options) {
        options = options || {};
        const src = options.src || options.url;
        const mode = options.mode || options.widthMode || 'normal';
        const aspect = options.aspect || (mode === 'tall' ? '4/5' : '16/9');
        const maxWidth = maxWidthForMode(mode);

        const wrap = document.createElement('div');
        wrap.setAttribute('data-embokoun-node', '1');
        wrap.setAttribute('data-embokoun-media-frame', '1');
        wrap.style.cssText = `width:100%;max-width:${maxWidth};display:flex;flex-direction:column;gap:5px;`;

        const frame = root.ui.iframe(src, `${aspectStyle(aspect)}resize:vertical;`);
        wrap.appendChild(frame);

        if (options.reason) {
            const note = document.createElement('div');
            note.textContent = String(options.reason);
            note.style.cssText = 'font:11px sans-serif;color:#888;text-align:right;';
            wrap.appendChild(note);
        }

        return wrap;
    }

    async function renderBlobVideo(ctx, result, placeholderNode) {
        const loading = root.ui.makeDownloadPanel(ctx.service, ctx);
        let cancelled = false;
        let download = null;

        if (placeholderNode && placeholderNode.isConnected) {
            placeholderNode.replaceWith(loading.panel);
        }

        download = root.blob.download(result.url, {
            referer: result.referer || ctx.originalUrl,
            area: ctx.service.key,
            maxBytes: result.maxBytes,
            onProgress(progress) {
                const loaded = progress.loaded || 0;
                const total = progress.total || 0;

                if (total > 0) {
                    loading.setStatus(`Downloading ${ctx.service.label}... ${root.blob.formatBytes(loaded)} / ${root.blob.formatBytes(total)}`);
                } else if (loaded > 0) {
                    loading.setStatus(`Downloading ${ctx.service.label}... ${root.blob.formatBytes(loaded)}`);
                }

                root.log.trace(ctx.service.key, 'download progress', loaded, total);
            }
        });

        loading.setCancel(() => {
            cancelled = true;
            if (download && typeof download.abort === 'function') download.abort();

            if (loading.panel.isConnected) {
                loading.panel.replaceWith(root.ui.makePlaceholder(ctx.service, ctx));
            }
        });

        try {
            const blob = await download.promise;

            if (cancelled) {
                if (blob && blob.blobUrl) URL.revokeObjectURL(blob.blobUrl);
                throw new Error('Download cancelled');
            }

            const video = root.blob.makeVideoFromBlob(blob.blobUrl, ctx.service, () => root.ui.makePlaceholder(ctx.service, ctx));
            const wrapped = shell(video, ctx);

            if (loading.panel.isConnected) {
                loading.panel.replaceWith(wrapped);
            }

            return wrapped;
        } catch (e) {
            if (cancelled) throw e;

            loading.setStatus(`${ctx.service.label} blob load failed. Opening fallback...`);
            loading.disableCancel();

            if (loading.panel.isConnected && typeof ctx.service.fallback === 'function') {
                loading.panel.replaceWith(shell(ctx.service.fallback(ctx), ctx));
            }

            throw e;
        }
    }

    async function renderResolved(ctx, result, placeholderNode) {
        if (!result || result.kind === 'none') {
            throw new Error((result && result.reason) || 'No renderable result');
        }

        root.log.debug(ctx.service.key, 'render result', result.kind, result.reason || '');

        if (result.kind === 'native-node') {
            if (!result.node) throw new Error('native-node result without node');
            return shell(result.node, ctx);
        }

        if (result.kind === 'iframe') {
            return shell(fallbackFrame({
                src: result.url || result.fallbackUrl,
                service: ctx.service,
                originalUrl: ctx.originalUrl,
                mode: result.widthMode,
                aspect: result.aspect,
                reason: result.reason
            }), ctx);
        }

        if (result.kind === 'image-url') {
            if (!result.url) throw new Error('image-url result without url');
            return shell(makeImage(result.url, result), ctx);
        }

        if (result.kind === 'video-url') {
            if (!result.url) throw new Error('video-url result without url');

            if (result.blob === false) {
                return shell(makeStreamingVideo(result.url, result, ctx), ctx);
            }

            return renderBlobVideo(ctx, result, placeholderNode);
        }

        throw new Error(`Unknown render kind: ${result.kind}`);
    }

    async function embed(ctx, placeholderNode) {
        const service = ctx && ctx.service;
        if (!service) throw new Error('Missing service in render context');

        if (typeof service.resolve === 'function') {
            const result = await service.resolve(ctx);
            return renderResolved(ctx, result, placeholderNode);
        }

        if (typeof service.embed === 'function') {
            return shell(await service.embed(ctx), ctx);
        }

        throw new Error(`Service ${service.key || '?'} has no resolve/embed handler`);
    }

    root.render = {
        embed,
        renderResolved,
        fallbackFrame,
        makeVideo,
        makeImage
    };
})();
