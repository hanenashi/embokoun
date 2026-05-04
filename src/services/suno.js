// embokoun Suno service
(function() {
    'use strict';

    const root = window.Embokoun;

    root.services.register({
        key: 'suno',
        label: 'Suno',
        style: 'height:240px;min-height:220px;background:#0f1014;',

        match(url) {
            return url.match(/suno\.com\/song\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        },

        async resolve(ctx) {
            const id = ctx.match[1];
            root.log.debug('suno', 'resolved id', id);
            return {
                kind: 'iframe',
                url: `https://suno.com/embed/${encodeURIComponent(id)}`,
                widthMode: 'normal',
                aspect: '19/6',
                reason: 'suno-embed'
            };
        },

        fallback(ctx) {
            const id = ctx.match[1];
            return root.render.fallbackFrame({
                src: `https://suno.com/embed/${encodeURIComponent(id)}`,
                mode: 'normal',
                aspect: '19/6',
                reason: 'suno-fallback'
            });
        }
    });
})();
