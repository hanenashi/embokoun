// embokoun YouTube service
(function() {
    'use strict';

    const root = window.Embokoun;

    function thumbnailUrl(id) {
        return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
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
