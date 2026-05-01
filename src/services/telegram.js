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

    function extractVideoUrl(doc, baseUrl) {
        const video = doc.querySelector('video[src], video source[src], source[type*="video"][src]');
        if (video && video.getAttribute('src')) return absUrl(video.getAttribute('src'), baseUrl);

        const meta = doc.querySelector('meta[property="og:video"], meta[property="og:video:secure_url"], meta[name="twitter:player:stream"]');
        if (meta && meta.getAttribute('content')) return absUrl(meta.getAttribute('content'), baseUrl);

        const html = doc.documentElement ? doc.documentElement.innerHTML : '';
        const match = html.match(/https?:\\?\/\\?\/[^"'<>\s]+?\.mp4[^"'<>\s]*/i) ||
                      html.match(/https?:\\?\/\\?\/[^"'<>\s]+?cdn-telegram\.org\\?\/file\\?\/[^"'<>\s]+/i);
        if (!match) return '';

        return absUrl(decodeHtml(match[0]).replace(/\\\//g, '/'), baseUrl);
    }

    function extractImageUrl(doc, baseUrl) {
        const photo = doc.querySelector('.tgme_widget_message_photo_wrap');
        if (photo) {
            const bg = extractBackgroundUrl(photo.style && photo.style.backgroundImage);
            if (bg) return absUrl(bg, baseUrl);

            const styleAttr = photo.getAttribute('style') || '';
            const bg2 = extractBackgroundUrl(styleAttr);
            if (bg2) return absUrl(bg2, baseUrl);
        }

        const img = doc.querySelector('.tgme_widget_message_photo_wrap img[src], .tgme_widget_message_bubble img[src], img.tgme_widget_message_photo[src]');
        if (img && img.getAttribute('src')) return absUrl(img.getAttribute('src'), baseUrl);

        const meta = doc.querySelector('meta[property="og:image"], meta[name="twitter:image"]');
        if (meta && meta.getAttribute('content')) return absUrl(meta.getAttribute('content'), baseUrl);

        return '';
    }

    function cleanTelegramText(node, baseUrl) {
        if (!node) return '';

        const clone = node.cloneNode(true);

        clone.querySelectorAll('script, style').forEach(el => el.remove());

        clone.querySelectorAll('a[href]').forEach(a => {
            a.href = absUrl(a.getAttribute('href'), baseUrl);
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
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
        const meta = doc.querySelector('.tgme_widget_message_meta');
        return meta ? meta.textContent.replace(/\s+/g, ' ').trim() : '';
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

        if (data.imageUrl) {
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

        const link = document.createElement('a');
        link.href = data.originalUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open';
        link.style.cssText = 'color:#168acd;text-decoration:none;font-weight:bold;flex:0 0 auto;';

        footer.appendChild(meta);
        footer.appendChild(link);
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

            const videoUrl = extractVideoUrl(doc, embedUrl);
            if (videoUrl) {
                root.log.info('telegram', 'resolved video', videoUrl);
                return {
                    kind: 'video-url',
                    url: videoUrl,
                    referer: 'https://t.me/',
                    aspect: '16/9',
                    reason: 'telegram-video'
                };
            }

            const imageUrl = extractImageUrl(doc, embedUrl);
            const textNode = doc.querySelector('.tgme_widget_message_text');
            const textHtml = cleanTelegramText(textNode, embedUrl);
            const author = extractAuthor(doc);
            const meta = extractMeta(doc);

            if (imageUrl || textHtml) {
                root.log.info('telegram', 'resolved native card', channel, postId);
                return {
                    kind: 'native-node',
                    node: makeCard({ imageUrl, textHtml, author, meta, originalUrl: publicUrl }),
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
