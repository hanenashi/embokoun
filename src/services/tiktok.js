// embokoun TikTok service
(function() {
    'use strict';

    const root = window.Embokoun;

    root.services.register({
        key: 'tiktok',
        label: 'TikTok',
        style: 'aspect-ratio:9/16;max-height:620px;background:#000;',

        match(url) {
            return url.match(/tiktok\.com\/@[a-zA-Z0-9._-]+\/video\/(\d+)/i);
        },

        async resolve(ctx) {
            const id = ctx.match[1];
            root.log.debug('tiktok', 'resolved id', id);
            return {
                kind: 'iframe',
                url: `https://www.tiktok.com/embed/v2/${encodeURIComponent(id)}`,
                widthMode: 'normal',
                aspect: '9/16',
                reason: 'tiktok-embed'
            };
        },

        fallback(ctx) {
            const id = ctx.match[1];
            return root.render.fallbackFrame({
                src: `https://www.tiktok.com/embed/v2/${encodeURIComponent(id)}`,
                mode: 'normal',
                aspect: '9/16',
                reason: 'tiktok-fallback'
            });
        }
    });
})();
