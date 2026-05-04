// embokoun YouTube service
(function() {
    'use strict';

    const root = window.Embokoun;
    const thumbCache = new Map();

    function thumbnailCandidates(id) {
        const safe = encodeURIComponent(id);
        return [
            `https://i.ytimg.com/vi/${safe}/hqdefault.jpg`,
            `https://i.ytimg.com/vi/${safe}/mqdefault.jpg`,
            `https://i.ytimg.com/vi/${safe}/default.jpg`,
            `https://img.youtube.com/vi/${safe}/hqdefault.jpg`,
            `https://img.youtube.com/vi/${safe}/mqdefault.jpg`,
            `https://img.youtube.com/vi/${safe}/default.jpg`
        ];
    }

    function fetchThumbBlob(url) {
        return new Promise((resolve, reject) => {
            root.gm.request({
                method: 'GET',
                url,
                timeout: 12000,
                responseType: 'blob',
                headers: {
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Referer': 'https://www.youtube.com/'
                },
                onload: (res) => {
                    if (res.status < 200 || res.status >= 300 || !res.response || !res.response.size) {
                        reject(new Error(`YouTube thumb HTTP ${res.status}`));
                        return;
                    }
                    resolve(URL.createObjectURL(res.response));
                },
                onerror: () => reject(new Error('YouTube thumb request failed')),
                ontimeout: () => reject(new Error('YouTube thumb request timeout'))
            });
        });
    }

    async function thumbnailUrl(id) {
        if (thumbCache.has(id)) return thumbCache.get(id);

        const promise = (async () => {
            const candidates = thumbnailCandidates(id);
            for (const url of candidates) {
                try {
                    root.log.debug('youtube', 'fetching thumbnail blob', url);
                    const blobUrl = await fetchThumbBlob(url);
                    root.log.info('youtube', 'thumbnail blob ready', url);
                    return blobUrl;
                } catch (e) {
                    root.log.warn('youtube', 'thumbnail candidate failed', url, e);
                }
            }
            root.log.warn('youtube', 'all thumbnail blob candidates failed', id);
            return candidates[0];
        })();

        thumbCache.set(id, promise);
        return promise;
    }

    root.services.register({
        key: 'youtube',
        label: 'YouTube',
        style: 'aspect-ratio:16/9;background:#111;',

        match(url) {
            return url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i);
        },

        placeholderImage(ctx) {
            return thumbnailUrl(ctx.match[1]);
        },

        async resolve(ctx) {
            const id = ctx.match[1];
            root.log.debug('youtube', 'resolved id', id);
            return {
                kind: 'iframe',
                url: `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1`,
                widthMode: 'normal',
                aspect: '16/9',
                reason: 'youtube-embed'
            };
        },

        fallback(ctx) {
            const id = ctx.match[1];
            return root.render.fallbackFrame({
                src: `https://www.youtube.com/embed/${encodeURIComponent(id)}`,
                mode: 'normal',
                aspect: '16/9',
                reason: 'youtube-fallback'
            });
        }
    });
})();
