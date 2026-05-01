// embokoun Telegram service
(function() {
    'use strict';

    const root = window.Embokoun;

    function absUrl(url, base) {
        if (!url) return '';
        try { return new URL(url, base || 'https://t.me/').href; }
        catch (e) { return String(url || ''); }
    }

    function decodeHtml(str) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = String(str || '');
        return textarea.value;
    }

    function uniqPush(list, item, keyName) {
        if (!item) return;
        const key = item[keyName || 'url'];
        if (!key) return;
        if (!list.some(existing => existing[keyName || 'url'] === key)) list.push(item);
    }

    function getText(url, referer, timeout) {
        timeout = timeout || 15000;
        return new Promise((resolve, reject) => {
            root.gm.request({
                method: 'GET',
                url,
                timeout,
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Referer': referer || 'https://t.me/'
                },
                onload: (res) => {
                    if (res.status < 200 || res.status >= 300) {
                        reject(new Error(`Telegram HTTP ${res.status}`));
                        return;
                    }
                    resolve(res.responseText || '');
                },
                onerror: () => reject(new Error('Telegram HTML request failed')),
                ontimeout: () => reject(new Error('Telegram HTML request timeout'))
            });
        });
    }

    function parseEmbedHtml(html) {
        return new DOMParser().parseFromString(String(html || ''), 'text/html');
    }

    function extractBackgroundUrl(value) {
        const raw = String(value || '');
        const match = raw.match(/url\((['"]?)(.*?)\1\)/i);
        return match ? decodeHtml(match[2]) : '';
    }

    function extractVideoItems(doc, baseUrl) {
        const items = [];

        doc.querySelectorAll('.tgme_widget_message_video_player, video[src], video source[src], source[type*="video"][src]').forEach(el => {
            const videoEl = el.matches && el.matches('video[src], video source[src], source[type*="video"][src]')
                ? el
                : el.querySelector('video[src], video source[src], source[type*="video"][src]');
            const src = videoEl && videoEl.getAttribute('src');
            if (!src) return;

            let thumb = '';
            const thumbEl = el.querySelector ? el.querySelector('.tgme_widget_message_video_thumb') : null;
            if (thumbEl) thumb = extractBackgroundUrl((thumbEl.style && thumbEl.style.backgroundImage) || thumbEl.getAttribute('style'));

            const durationEl = el.querySelector ? el.querySelector('.message_video_duration') : null;
            const href = el.getAttribute && el.getAttribute('href');

            uniqPush(items, {
                type: 'video',
                url: absUrl(src, baseUrl),
                thumbUrl: absUrl(thumb, baseUrl),
                duration: durationEl ? durationEl.textContent.trim() : '',
                href: absUrl(href, baseUrl)
            });
        });

        const meta = doc.querySelector('meta[property="og:video"], meta[property="og:video:secure_url"], meta[name="twitter:player:stream"]');
        if (meta && meta.getAttribute('content')) {
            uniqPush(items, { type: 'video', url: absUrl(meta.getAttribute('content'), baseUrl), thumbUrl: '', duration: '', href: '' });
        }

        const html = doc.documentElement ? doc.documentElement.innerHTML : '';
        const matches = html.match(/https?:\\?\/\\?\/[^"'<>\s]+?\.mp4[^"'<>\s]*/ig) || [];
        matches.forEach(match => {
            uniqPush(items, { type: 'video', url: absUrl(decodeHtml(match).replace(/\\\//g, '/'), baseUrl), thumbUrl: '', duration: '', href: '' });
        });

        return items;
    }

    function extractImageItems(doc, baseUrl) {
        const items = [];

        doc.querySelectorAll('.tgme_widget_message_photo_wrap').forEach(photo => {
            const bg = extractBackgroundUrl((photo.style && photo.style.backgroundImage) || photo.getAttribute('style'));
            const href = photo.getAttribute('href');
            uniqPush(items, {
                type: 'image',
                url: absUrl(bg, baseUrl),
                href: absUrl(href, baseUrl)
            });
        });

        doc.querySelectorAll('.tgme_widget_message_photo_wrap img[src], .tgme_widget_message_bubble img[src], img.tgme_widget_message_photo[src]').forEach(img => {
            uniqPush(items, {
                type: 'image',
                url: absUrl(img.getAttribute('src'), baseUrl),
                href: ''
            });
        });

        const meta = doc.querySelector('meta[property="og:image"], meta[name="twitter:image"]');
        if (meta && meta.getAttribute('content')) {
            uniqPush(items, { type: 'image', url: absUrl(meta.getAttribute('content'), baseUrl), href: '' });
        }

        return items;
    }

    function cleanTelegramText(node, baseUrl) {
        if (!node) return '';

        const clone = node.cloneNode(true);

        clone.querySelectorAll('script, style').forEach(el => el.remove());

        clone.querySelectorAll('a[href]').forEach(a => {
            a.href = absUrl(a.getAttribute('href'), baseUrl);
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.removeAttribute('onclick');
        });

        clone.querySelectorAll('img[src]').forEach(img => {
            img.src = absUrl(img.getAttribute('src'), baseUrl);
            img.loading = 'lazy';
            img.decoding = 'async';
            img.style.maxWidth = img.style.maxWidth || '1.25em';
            img.style.height = img.style.height || '1.25em';
            img.style.verticalAlign = img.style.verticalAlign || '-0.2em';
        });

        return clone.innerHTML.trim();
    }

    function extractAuthor(doc) {
        const author = doc.querySelector('.tgme_widget_message_author, .tgme_widget_message_owner_name, .tgme_widget_message_from_author');
        return author ? author.textContent.trim() : 'Telegram';
    }

    function extractMeta(doc) {
        const meta = doc.querySelector('.tgme_widget_message_info');
        return meta ? meta.textContent.replace(/\s+/g, ' ').trim() : '';
    }

    function tileBaseStyle(total) {
        return [
            'position:relative;',
            'display:block;',
            'overflow:hidden;',
            'background:#111;',
            'min-height:120px;',
            total === 1 ? 'aspect-ratio:16/9;' : 'aspect-ratio:1/1;'
        ].join('');
    }

    function makeTileStatus(text) {
        const box = document.createElement('div');
        box.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;background:rgba(0,0,0,0.78);color:#fff;font:12px sans-serif;padding:10px;box-sizing:border-box;z-index:4;';
        box.textContent = text;
        return box;
    }

    function loadVideoIntoTile(tile, item, total) {
        if (!item || !item.url || tile.dataset.loading === '1') return;

        tile.dataset.loading = '1';
        tile.href = '#';
        const status = makeTileStatus('Downloading video...');
        tile.appendChild(status);

        let cancelled = false;
        const download = root.blob.download(item.url, {
            referer: 'https://t.me/',
            area: 'telegram-card',
            onProgress(progress) {
                const loaded = progress.loaded || 0;
                const totalBytes = progress.total || 0;
                if (totalBytes > 0) {
                    status.textContent = `Downloading video... ${root.blob.formatBytes(loaded)} / ${root.blob.formatBytes(totalBytes)}`;
                } else if (loaded > 0) {
                    status.textContent = `Downloading video... ${root.blob.formatBytes(loaded)}`;
                }
            }
        });

        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.textContent = 'Cancel';
        cancel.style.cssText = 'position:absolute;right:6px;bottom:6px;z-index:5;font:11px sans-serif;border:1px solid rgba(255,255,255,0.35);border-radius:10px;background:rgba(0,0,0,0.65);color:#fff;padding:3px 7px;';
        cancel.onclick = ev => {
            ev.preventDefault();
            ev.stopPropagation();
            cancelled = true;
            download.abort();
            tile.replaceWith(mediaTile(item, 0, total));
        };
        tile.appendChild(cancel);

        download.promise.then(blob => {
            if (cancelled) {
                if (blob && blob.blobUrl) URL.revokeObjectURL(blob.blobUrl);
                return;
            }

            const video = root.blob.makeVideoFromBlob(blob.blobUrl, {
                key: 'telegram-card',
                label: 'Telegram',
                style: `${total === 1 ? 'aspect-ratio:16/9;' : 'aspect-ratio:1/1;'}background:#000;box-shadow:none;border-radius:0;`
            }, () => mediaTile(item, 0, total));
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'contain';
            video.style.display = 'block';
            tile.replaceWith(video);
        }).catch(err => {
            if (cancelled) return;
            root.log.error('telegram', 'card video blob failed', err);
            status.textContent = 'Video load failed. Open original Telegram post.';
            cancel.textContent = 'Open';
            cancel.onclick = ev => {
                ev.preventDefault();
                ev.stopPropagation();
                window.open(item.href || item.url, '_blank', 'noopener,noreferrer');
            };
        });
    }

    function mediaTile(item, index, total) {
        const wrap = document.createElement('a');
        wrap.href = item.href || item.url || '#';
        wrap.target = '_blank';
        wrap.rel = 'noopener noreferrer';
        wrap.style.cssText = tileBaseStyle(total);

        const img = document.createElement('img');
        img.src = item.thumbUrl || item.url;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        wrap.appendChild(img);

        if (item.type === 'video') {
            wrap.dataset.telegramVideoTile = '1';
            wrap.addEventListener('click', ev => {
                ev.preventDefault();
                ev.stopPropagation();
                loadVideoIntoTile(wrap, item, total);
            });

            const play = document.createElement('div');
            play.textContent = '▶';
            play.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,0.55);color:#fff;display:flex;align-items:center;justify-content:center;font-size:21px;text-indent:3px;';
            wrap.appendChild(play);

            const label = document.createElement('div');
            label.textContent = item.duration ? `Video ${item.duration}` : 'Video';
            label.style.cssText = 'position:absolute;right:6px;bottom:6px;background:rgba(0,0,0,0.65);color:#fff;border-radius:10px;padding:3px 7px;font:11px sans-serif;';
            wrap.appendChild(label);
        }

        return wrap;
    }

    function appendMediaGrid(card, mediaItems) {
        if (!mediaItems || !mediaItems.length) return null;

        const grid = document.createElement('div');
        const count = Math.min(mediaItems.length, 4);
        grid.style.cssText = [
            'display:grid;',
            count === 1 ? 'grid-template-columns:1fr;' : 'grid-template-columns:repeat(2,1fr);',
            'gap:2px;',
            'background:#111;'
        ].join('');

        mediaItems.slice(0, 4).forEach((item, index) => {
            const tile = mediaTile(item, index, count);
            if (count === 3 && index === 0) tile.style.gridRow = 'span 2';
            grid.appendChild(tile);
        });

        card.appendChild(grid);
        return grid;
    }

    function makeCard(data) {
        const card = document.createElement('div');
        card.setAttribute('data-embokoun-node', '1');
        card.style.cssText = [
            'width:100%;',
            'max-width:550px;',
            'box-sizing:border-box;',
            'border:1px solid #d7e3ec;',
            'border-radius:8px;',
            'background:#fff;',
            'color:#212121;',
            'font-family:Roboto,Arial,sans-serif;',
            'font-size:14px;',
            'line-height:1.38;',
            'overflow:hidden;',
            'box-shadow:0 2px 8px rgba(0,0,0,0.16);'
        ].join('');

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 12px 8px;border-bottom:1px solid #edf3f7;';

        const dot = document.createElement('div');
        dot.textContent = 'T';
        dot.style.cssText = 'width:26px;height:26px;border-radius:50%;background:#2481cc;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;flex:0 0 auto;';

        const title = document.createElement('div');
        title.style.cssText = 'font-weight:bold;color:#168acd;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        title.textContent = data.author || 'Telegram';

        header.appendChild(dot);
        header.appendChild(title);
        card.appendChild(header);

        appendMediaGrid(card, data.mediaItems || []);

        if ((!data.mediaItems || !data.mediaItems.length) && data.imageUrl) {
            const img = document.createElement('img');
            img.src = data.imageUrl;
            img.loading = 'lazy';
            img.decoding = 'async';
            img.style.cssText = 'display:block;width:100%;height:auto;max-height:520px;object-fit:contain;background:#111;';
            card.appendChild(img);
        }

        if (data.textHtml) {
            const text = document.createElement('div');
            text.style.cssText = 'padding:10px 12px;white-space:normal;overflow-wrap:anywhere;';
            text.innerHTML = data.textHtml;
            card.appendChild(text);
        }

        const footer = document.createElement('div');
        footer.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-top:1px solid #edf3f7;font-size:12px;color:#8197af;';

        const meta = document.createElement('span');
        meta.textContent = data.meta || 'Telegram post';
        meta.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

        const links = document.createElement('span');
        links.style.cssText = 'display:flex;gap:10px;flex:0 0 auto;';

        if (data.videoUrl) {
            const play = document.createElement('a');
            play.href = '#';
            play.textContent = 'Video';
            play.style.cssText = 'color:#168acd;text-decoration:none;font-weight:bold;';
            play.addEventListener('click', ev => {
                ev.preventDefault();
                ev.stopPropagation();
                const tile = card.querySelector('[data-telegram-video-tile="1"]');
                if (tile) tile.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            });
            links.appendChild(play);
        }

        const link = document.createElement('a');
        link.href = data.originalUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open';
        link.style.cssText = 'color:#168acd;text-decoration:none;font-weight:bold;';
        links.appendChild(link);

        footer.appendChild(meta);
        footer.appendChild(links);
        card.appendChild(footer);

        return card;
    }

    function makeIframe(channel, postId) {
        return root.render.fallbackFrame({
            src: `https://t.me/${encodeURIComponent(channel)}/${encodeURIComponent(postId)}?embed=1&mode=tme`,
            mode: 'normal',
            aspect: '4/5',
            reason: 'telegram-iframe'
        });
    }

    root.services.register({
        key: 'telegram',
        label: 'Telegram',
        style: 'aspect-ratio:4/5;min-height:360px;background:#15202b;',

        match(url) {
            return url.match(/(?:t\.me|telegram\.me)\/(?:s\/)?([a-zA-Z0-9_]+)\/(\d+)/i);
        },

        async resolve(ctx) {
            const channel = ctx.match[1];
            const postId = ctx.match[2];
            const publicUrl = `https://t.me/${encodeURIComponent(channel)}/${encodeURIComponent(postId)}`;
            const embedUrl = `${publicUrl}?embed=1&mode=tme`;

            root.log.info('telegram', 'fetching embed', embedUrl);
            const html = await getText(embedUrl, 'https://t.me/');
            const doc = parseEmbedHtml(html);

            const videoItems = extractVideoItems(doc, embedUrl);
            const imageItems = extractImageItems(doc, embedUrl);
            const textNode = doc.querySelector('.tgme_widget_message_text');
            const textHtml = cleanTelegramText(textNode, embedUrl);
            const author = extractAuthor(doc);
            const meta = extractMeta(doc);
            const mediaItems = [];
            videoItems.forEach(item => uniqPush(mediaItems, item));
            imageItems.forEach(item => uniqPush(mediaItems, item));

            const isPureSingleVideo = videoItems.length === 1 && imageItems.length === 0 && !textHtml;
            if (isPureSingleVideo) {
                root.log.info('telegram', 'resolved pure video', videoItems[0].url);
                return {
                    kind: 'video-url',
                    url: videoItems[0].url,
                    referer: 'https://t.me/',
                    aspect: '16/9',
                    reason: 'telegram-video'
                };
            }

            if (mediaItems.length || textHtml) {
                root.log.info('telegram', 'resolved native card', channel, postId, `media=${mediaItems.length}`);
                return {
                    kind: 'native-node',
                    node: makeCard({
                        imageUrl: imageItems[0] && imageItems[0].url,
                        videoUrl: videoItems[0] && videoItems[0].url,
                        mediaItems,
                        textHtml,
                        author,
                        meta,
                        originalUrl: publicUrl
                    }),
                    reason: 'telegram-card'
                };
            }

            root.log.warn('telegram', 'no media/text found; iframe fallback', channel, postId);
            return {
                kind: 'iframe',
                url: embedUrl,
                widthMode: 'normal',
                aspect: '4/5',
                reason: 'telegram-iframe'
            };
        },

        fallback(ctx) {
            return makeIframe(ctx.match[1], ctx.match[2]);
        }
    });
})();
