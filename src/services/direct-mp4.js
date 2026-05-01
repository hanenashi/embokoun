// embokoun Direct MP4 service
(function() {
    'use strict';

    const root = window.Embokoun;

    root.services.register({
        key: 'direct-mp4',
        label: 'Direct MP4',
        style: 'aspect-ratio:16/9;background:#000;max-height:550px;',

        match(url) {
            return url.match(/(https?:\/\/[^\s"'<>]+\.mp4(?:\?[^\s"'<>]*)?)/i);
        },

        async resolve(ctx) {
            const url = ctx.match[1];
            root.log.debug('direct-mp4', 'resolved native video', url);
            return {
                kind: 'video-url',
                url,
                blob: false,
                preload: 'none',
                autoplay: false,
                aspect: '16/9',
                style: 'aspect-ratio:16/9;background:#000;max-height:550px;',
                reason: 'direct-mp4'
            };
        }
    });
})();
