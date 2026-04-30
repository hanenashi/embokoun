// embokoun YouTube service
(function() {
    'use strict';

    const root = window.Embokoun;

    root.services.register({
        key: 'youtube',
        label: 'YouTube',
        style: 'aspect-ratio:16/9;',

        match(url) {
            return url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i);
        },

        async embed(ctx) {
            const id = ctx.match[1];
            root.log.debug('youtube', 'embedding id', id);
            return root.ui.iframe(`https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1`, 'aspect-ratio:16/9;');
        },

        fallback(ctx) {
            const id = ctx.match[1];
            return root.ui.iframe(`https://www.youtube.com/embed/${encodeURIComponent(id)}`, 'aspect-ratio:16/9;');
        }
    });
})();
