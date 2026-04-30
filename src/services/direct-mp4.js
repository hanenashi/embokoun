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

        async embed(ctx) {
            const video = document.createElement('video');
            video.setAttribute('data-embokoun-node', '1');
            video.src = ctx.match[1];
            video.controls = true;
            video.preload = 'none';
            video.playsInline = true;
            video.style.cssText = 'width:100%;aspect-ratio:16/9;background:#000;max-height:550px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
            root.log.debug('direct-mp4', 'created native video', ctx.match[1]);
            return video;
        }
    });
})();
