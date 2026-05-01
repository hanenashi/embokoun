// embokoun Vimeo service
(function() {
    'use strict';

    const root = window.Embokoun;

    root.services.register({
        key: 'vimeo',
        label: 'Vimeo',
        style: 'aspect-ratio:16/9;',

        match(url) {
            return url.match(/vimeo\.com\/(?:.*#|.*\/videos\/)?([0-9]+)/i);
        },

        async resolve(ctx) {
            const id = ctx.match[1];
            root.log.debug('vimeo', 'resolved id', id);
            return {
                kind: 'iframe',
                url: `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1`,
                widthMode: 'normal',
                aspect: '16/9',
                reason: 'vimeo-embed'
            };
        },

        fallback(ctx) {
            const id = ctx.match[1];
            return root.render.fallbackFrame({
                src: `https://player.vimeo.com/video/${encodeURIComponent(id)}`,
                mode: 'normal',
                aspect: '16/9',
                reason: 'vimeo-fallback'
            });
        }
    });
})();
