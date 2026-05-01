// embokoun Twitter/X service
(function() {
    'use strict';

    const root = window.Embokoun;

    function makeFallback(id) {
        return root.render.fallbackFrame({
            src: `https://platform.twitter.com/embed/Tweet.html?id=${encodeURIComponent(id)}`,
            mode: 'normal',
            aspect: '1/1',
            reason: 'twitter-fallback'
        });
    }

    function getJson(url, timeout) {
        timeout = timeout || 12000;
        return new Promise((resolve, reject) => {
            root.gm.request({
                method: 'GET',
                url,
                timeout,
                headers: { 'Accept': 'application/json,text/plain,*/*' },
                onload: (res) => {
                    if (res.status < 200 || res.status >= 300) {
                        reject(new Error(`HTTP ${res.status}`));
                        return;
                    }

                    try {
                        resolve(JSON.parse(res.responseText));
                    } catch (e) {
                        reject(new Error('Bad JSON response'));
                    }
                },
                onerror: () => reject(new Error('Twitter metadata request failed')),
                ontimeout: () => reject(new Error('Twitter metadata request timeout'))
            });
        });
    }

    function firstMp4(data) {
        return (
            (data.mediaURLs || []).find(url => /\.mp4(?:\?|$)/i.test(url)) ||
            (data.media_extended || [])
                .map(item => item && item.url)
                .find(url => /\.mp4(?:\?|$)/i.test(url || ''))
        );
    }

    root.services.register({
        key: 'twitter',
        label: 'Twitter/X',
        style: 'aspect-ratio:16/9;background:#000;',

        match(url) {
            return url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/(\d+)/i);
        },

        async resolve(ctx) {
            const username = ctx.match[1];
            const id = ctx.match[2];
            const apiUrl = `https://api.vxtwitter.com/${encodeURIComponent(username)}/status/${encodeURIComponent(id)}`;

            root.log.info('twitter', 'fetching metadata', apiUrl);
            const data = await getJson(apiUrl);
            const videoUrl = firstMp4(data);

            if (!videoUrl) {
                root.log.warn('twitter', 'no mp4 found; using iframe fallback', id);
                return {
                    kind: 'iframe',
                    url: `https://platform.twitter.com/embed/Tweet.html?id=${encodeURIComponent(id)}`,
                    widthMode: 'normal',
                    aspect: '1/1',
                    reason: 'no-mp4-found'
                };
            }

            root.log.info('twitter', 'resolved mp4', videoUrl);
            return {
                kind: 'video-url',
                url: videoUrl,
                referer: 'https://x.com/',
                aspect: '16/9',
                reason: 'twitter-mp4'
            };
        },

        fallback(ctx) {
            return makeFallback(ctx.match[2]);
        }
    });
})();
