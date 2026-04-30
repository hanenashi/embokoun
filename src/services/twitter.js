// embokoun Twitter/X service
(function() {
    'use strict';

    const root = window.Embokoun;

    function makeFallback(id) {
        const frame = document.createElement('iframe');
        frame.setAttribute('data-embokoun-node', '1');
        frame.src = `https://platform.twitter.com/embed/Tweet.html?id=${encodeURIComponent(id)}`;
        frame.style.cssText = 'width:100%;height:460px;resize:vertical;border:none;border-radius:4px;background:#fff;';
        frame.allowFullscreen = true;
        frame.allow = 'autoplay; fullscreen; picture-in-picture';
        return frame;
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

        async embed(ctx) {
            const username = ctx.match[1];
            const id = ctx.match[2];
            const apiUrl = `https://api.vxtwitter.com/${encodeURIComponent(username)}/status/${encodeURIComponent(id)}`;

            root.log.info('twitter', 'fetching metadata', apiUrl);
            const data = await getJson(apiUrl);
            const videoUrl = firstMp4(data);

            if (!videoUrl) {
                throw new Error('No MP4 found in tweet metadata');
            }

            root.log.info('twitter', 'fetching mp4 blob', videoUrl);
            const result = root.blob.download(videoUrl, {
                referer: 'https://x.com/',
                area: 'twitter',
                onProgress(progress) {
                    root.log.trace('twitter', 'download progress', progress.loaded, progress.total);
                }
            });

            const blob = await result.promise;
            return root.blob.makeVideoFromBlob(blob.blobUrl, ctx.service, () => root.ui.makePlaceholder(ctx.service, ctx));
        },

        fallback(ctx) {
            return makeFallback(ctx.match[2]);
        }
    });
})();
