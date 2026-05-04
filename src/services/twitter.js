// embokoun Twitter/X service
(function() {
    'use strict';

    const root = window.Embokoun;
    const metaCache = new Map();
    const thumbCache = new Map();

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

    function fetchMeta(username, id) {
        const key = `${username}/${id}`;
        if (metaCache.has(key)) return metaCache.get(key);

        const apiUrl = `https://api.vxtwitter.com/${encodeURIComponent(username)}/status/${encodeURIComponent(id)}`;
        const promise = getJson(apiUrl);
        metaCache.set(key, promise);
        return promise;
    }

    function firstMp4(data) {
        return (
            (data.mediaURLs || []).find(url => /\.mp4(?:\?|$)/i.test(url)) ||
            (data.media_extended || [])
                .map(item => item && item.url)
                .find(url => /\.mp4(?:\?|$)/i.test(url || ''))
        );
    }

    function firstImage(data) {
        const candidates = [];

        if (Array.isArray(data.mediaURLs)) candidates.push(...data.mediaURLs);
        if (Array.isArray(data.media_extended)) {
            data.media_extended.forEach(item => {
                if (!item) return;
                candidates.push(item.thumbnail_url, item.poster_url, item.url);
            });
        }

        candidates.push(
            data.thumbnail_url,
            data.thumbnail,
            data.poster_url,
            data.image,
            data.image_url,
            data.photo,
            data.user_profile_image_url
        );

        return candidates
            .filter(Boolean)
            .map(String)
            .find(url => /^https?:\/\//i.test(url) && !/\.mp4(?:\?|$)/i.test(url));
    }

    function fetchImageBlob(url) {
        return new Promise((resolve, reject) => {
            root.gm.request({
                method: 'GET',
                url,
                timeout: 12000,
                responseType: 'blob',
                headers: {
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Referer': 'https://x.com/'
                },
                onload: (res) => {
                    if (res.status < 200 || res.status >= 300 || !res.response || !res.response.size) {
                        reject(new Error(`Twitter thumb HTTP ${res.status}`));
                        return;
                    }
                    resolve(URL.createObjectURL(res.response));
                },
                onerror: () => reject(new Error('Twitter thumb request failed')),
                ontimeout: () => reject(new Error('Twitter thumb request timeout'))
            });
        });
    }

    async function thumbnailUrl(username, id) {
        const key = `${username}/${id}`;
        if (thumbCache.has(key)) return thumbCache.get(key);

        const promise = (async () => {
            root.log.debug('twitter', 'fetching thumbnail metadata', key);
            const data = await fetchMeta(username, id);
            const imageUrl = firstImage(data);

            if (!imageUrl) {
                root.log.warn('twitter', 'no thumbnail found', key);
                return '';
            }

            try {
                root.log.debug('twitter', 'fetching thumbnail blob', imageUrl);
                const blobUrl = await fetchImageBlob(imageUrl);
                root.log.info('twitter', 'thumbnail blob ready', imageUrl);
                return blobUrl;
            } catch (e) {
                root.log.warn('twitter', 'thumbnail blob failed; using direct url', imageUrl, e);
                return imageUrl;
            }
        })();

        thumbCache.set(key, promise);
        return promise;
    }

    root.services.register({
        key: 'twitter',
        label: 'Twitter/X',
        style: 'aspect-ratio:16/9;background:#000;',

        match(url) {
            return url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/(\d+)/i);
        },

        placeholderImage(ctx) {
            return thumbnailUrl(ctx.match[1], ctx.match[2]);
        },

        async resolve(ctx) {
            const username = ctx.match[1];
            const id = ctx.match[2];
            const apiUrl = `https://api.vxtwitter.com/${encodeURIComponent(username)}/status/${encodeURIComponent(id)}`;

            root.log.info('twitter', 'fetching metadata', apiUrl);
            const data = await fetchMeta(username, id);
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
