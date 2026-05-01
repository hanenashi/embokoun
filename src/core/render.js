// embokoun universal render core
(function() {
    'use strict';

    const root = window.Embokoun;

    function aspectStyle(aspect) {
        if (!aspect) return 'aspect-ratio:16/9;';
        return `aspect-ratio:${String(aspect).replace(':', '/')};`;
    }

    function maxWidthForMode(mode) {
        if (mode === 'wide') return '760px';
        if (mode === 'full') return '100%';
        return '550px';
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
            result.style || `${aspectStyle(result.aspect)}background:#000;max-height:550px;`,
            'border-radius:4px;',
            'box-shadow:0 2px 8px rgba(0,0,0,0.2);',
            'background:#000;'
        ].join('');
        return video;
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

    async function renderResolved(ctx, result) {
        if (!result || result.kind === 'none') {
            throw new Error((result && result.reason) || 'No renderable result');
        }

        root.log.debug(ctx.service.key, 'render result', result.kind, result.reason || '');

        if (result.kind === 'native-node') {
            if (!result.node) throw new Error('native-node result without node');
            return result.node;
        }

        if (result.kind === 'iframe') {
            return fallbackFrame({
                src: result.url || result.fallbackUrl,
                service: ctx.service,
                originalUrl: ctx.originalUrl,
                mode: result.widthMode,
                aspect: result.aspect,
                reason: result.reason
            });
        }

        if (result.kind === 'image-url') {
            if (!result.url) throw new Error('image-url result without url');
            return makeImage(result.url, result);
        }

        if (result.kind === 'video-url') {
            if (!result.url) throw new Error('video-url result without url');

            if (result.blob === false) {
                return makeVideo(result.url, result);
            }

            const download = root.blob.download(result.url, {
                referer: result.referer || ctx.originalUrl,
                area: ctx.service.key,
                maxBytes: result.maxBytes,
                onProgress(progress) {
                    root.log.trace(ctx.service.key, 'download progress', progress.loaded, progress.total);
                }
            });

            const blob = await download.promise;
            return root.blob.makeVideoFromBlob(blob.blobUrl, ctx.service, () => root.ui.makePlaceholder(ctx.service, ctx));
        }

        throw new Error(`Unknown render kind: ${result.kind}`);
    }

    async function embed(ctx) {
        const service = ctx && ctx.service;
        if (!service) throw new Error('Missing service in render context');

        if (typeof service.resolve === 'function') {
            const result = await service.resolve(ctx);
            return renderResolved(ctx, result);
        }

        if (typeof service.embed === 'function') {
            return service.embed(ctx);
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
