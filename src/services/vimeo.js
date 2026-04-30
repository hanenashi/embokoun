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

        async embed(ctx) {
            const id = ctx.match[1];
            root.log.debug('vimeo', 'embedding id', id);
            return root.ui.iframe(`https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1`, 'aspect-ratio:16/9;');
        },

        fallback(ctx) {
            const id = ctx.match[1];
            return root.ui.iframe(`https://player.vimeo.com/video/${encodeURIComponent(id)}`, 'aspect-ratio:16/9;');
        }
    });
})();
