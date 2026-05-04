// embokoun Instagram service
(function() {
    'use strict';

    const root = window.Embokoun;
    const thumbCache = new Map();

    function absUrl(url, base) {
        if (!url) return '';
        try { return new URL(url, base || 'https://www.instagram.com/').href; }
        catch (e) { return String(url || ''); }
    }

    function decodeHtml(str) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = String(str || '');
        return textarea.value;
    }

    function xmlEscape(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function looseDecodeUrl(value) {
        let out = decodeHtml(String(value || ''));
        out = out.replace(/\\u0026/g, '&');
        out = out.replace(/\\\//g, '/');
        out = out.replace(/&amp;/g, '&');
        try { out = decodeURIComponent(out); } catch (e) { /* keep original-ish */ }
        return out;
    }

    function getText(url, timeout) {
        timeout = timeout || 15000;
        return new Promise((resolve, reject) => {
            root.gm.request({
                method: 'GET',
                url,
                timeout,
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Referer': 'https://www.instagram.com/',
                    'User-Agent': navigator.userAgent
                },
                onload: (res) => {
                    if (res.status < 200 || res.status >= 300) {
                        reject(new Error(`Instagram HTTP ${res.status}`));
                        return;
                    }
                    resolve(res.responseText || '');
                },
                onerror: () => reject(new Error('Instagram HTML request failed')),
                ontimeout: () => reject(new Error('Instagram HTML request timeout'))
            });
        });
    }

    function metaContent(html, names) {
        for (const name of names) {
            const esc = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${esc}["'][^>]+content=["']([^"']+)["']`, 'i'));
            if (a && a[1]) return decodeHtml(a[1]);
            const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${esc}["']`, 'i'));
            if (b && b[1]) return decodeHtml(b[1]);
        }
        return '';
    }

    function looksLikeVideoUrl(url) {
        return /^https?:\/\//i.test(url) && (
            /\.mp4(?:[?#]|$)/i.test(url) ||
            /\/o1\/v\//i.test(url) ||
            /cdninstagram\.com\/.*video/i.test(url) ||
            /fbcdn\.net\/.*\.mp4/i.test(url)
        );
    }

    function extractVideoUrl(html, baseUrl) {
        if (!html) return '';

        const patterns = [
            /<video[^>]+src=["']([^"']+)["']/i,
            /<source[^>]+src=["']([^"']+)["']/i,
            /data-video=["']([^"']+)["']/i,
            /data-video-url=["']([^"']+)["']/i,
            /<meta[^>]+(?:property|name)=["']og:video(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
            /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:video(?::secure_url)?["']/i,
            /<meta[^>]+(?:property|name)=["']twitter:player:stream["'][^>]+content=["']([^"']+)["']/i,
            /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']twitter:player:stream["']/i,
            /"playable_url_quality_hd"\s*:\s*"([^"]+)"/i,
            /"playable_url"\s*:\s*"([^"]+)"/i,
            /"browser_native_hd_url"\s*:\s*"([^"]+)"/i,
            /"browser_native_sd_url"\s*:\s*"([^"]+)"/i,
            /"video_url"\s*:\s*"([^"]+)"/i,
            /"contentUrl"\s*:\s*"([^"]+)"/i,
            /"src"\s*:\s*"(https?:\\\/\\\/[^"<>]+?\.mp4[^"<>]*)"/i,
            /(https?:\\\/\\\/[^"<>]+?\.mp4[^"<>]*)/i,
            /(https?:\/\/[^"'<>\s]+?\.mp4[^"'<>\s]*)/i
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (!match || !match[1]) continue;

            const decoded = absUrl(looseDecodeUrl(match[1]), baseUrl);
            if (looksLikeVideoUrl(decoded)) return decoded;
        }

        return '';
    }

    function extractImageUrl(html, baseUrl) {
        const img = metaContent(html, ['og:image', 'twitter:image', 'twitter:image:src']);
        return img ? absUrl(looseDecodeUrl(img), baseUrl) : '';
    }

    function extractTitle(html) {
        const title = metaContent(html, ['og:title', 'twitter:title']);
        if (title) return title.trim();
        const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        return m ? decodeHtml(m[1]).replace(/\s+/g, ' ').trim() : 'Instagram';
    }

    function extractDescription(html) {
        const desc = metaContent(html, ['og:description', 'description', 'twitter:description']);
        return desc ? desc.replace(/\s+/g, ' ').trim() : '';
    }

    function cleanText(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function wrapForSvg(text, maxChars, maxLines) {
        const words = cleanText(text).split(' ').filter(Boolean);
        const lines = [];
        let line = '';
        for (const word of words) {
            const next = line ? `${line} ${word}` : word;
            if (next.length > maxChars && line) {
                lines.push(line);
                line = word;
                if (lines.length >= maxLines) break;
            } else {
                line = next;
            }
        }
        if (line && lines.length < maxLines) lines.push(line);
        if (!lines.length) lines.push('Preview unavailable');
        if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
            lines[lines.length - 1] = lines[lines.length - 1].replace(/[.,;:!?]*$/, '') + '...';
        }
        return lines;
    }

    function makePreviewSvg(title, description) {
        const heading = cleanText(title || 'Instagram preview unavailable').replace(/• Instagram.*$/i, '').slice(0, 70) || 'Instagram preview unavailable';
        const bodyText = cleanText(description || 'This post may require sign-in, app access, or account permissions.');
        const lines = wrapForSvg(bodyText, 48, 4);
        const lineSvg = lines.map((line, i) => `<text x="102" y="${180 + i * 40}" font-size="28" fill="#262626">${xmlEscape(line)}</text>`).join('');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
<defs><linearGradient id="ig" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f58529"/><stop offset="0.35" stop-color="#dd2a7b"/><stop offset="0.7" stop-color="#8134af"/><stop offset="1" stop-color="#515bd4"/></linearGradient></defs>
<rect width="800" height="450" fill="#111"/>
<rect x="54" y="45" width="692" height="360" rx="18" fill="#ffffff"/>
<rect x="88" y="74" width="50" height="50" rx="13" fill="url(#ig)"/>
<text x="113" y="106" text-anchor="middle" font-size="21" font-family="Arial, sans-serif" font-weight="700" fill="#fff">IG</text>
<text x="158" y="108" font-size="30" font-family="Arial, sans-serif" font-weight="700" fill="#262626">Instagram</text>
<line x1="78" y1="142" x2="722" y2="142" stroke="#efefef" stroke-width="2"/>
<text x="102" y="154" font-size="0" fill="transparent">.</text>
<text x="102" y="160" font-size="29" font-family="Arial, sans-serif" font-weight="700" fill="#262626">${xmlEscape(heading)}</text>
<g font-family="Arial, sans-serif">${lineSvg}</g>
<text x="102" y="365" font-size="22" font-family="Arial, sans-serif" font-weight="700" fill="#00376b">Open on Instagram</text>
</svg>`;
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    async function fetchThumb(publicUrl) {
        if (thumbCache.has(publicUrl)) return thumbCache.get(publicUrl);
        const promise = getText(publicUrl, 12000).then(html => {
            const image = extractImageUrl(html, publicUrl);
            if (image) return image;
            const title = extractTitle(html);
            const description = extractDescription(html);
            root.log.info('instagram', 'using generated placeholder preview', publicUrl);
            return makePreviewSvg(title, description);
        }).catch(err => {
            root.log.warn('instagram', 'thumbnail metadata failed; generated fallback', publicUrl, err);
            return makePreviewSvg('Instagram preview unavailable', 'This post may require sign-in, app access, or account permissions.');
        });
        thumbCache.set(publicUrl, promise);
        return promise;
    }

    function makeCard(data) {
        const card = document.createElement('div');
        card.setAttribute('data-embokoun-node', '1');
        card.style.cssText = [
            'width:100%;', 'max-width:430px;', 'box-sizing:border-box;', 'border:1px solid #dbdbdb;',
            'border-radius:8px;', 'background:#fff;', 'color:#262626;',
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
            'font-size:14px;', 'line-height:1.35;', 'overflow:hidden;', 'box-shadow:0 2px 8px rgba(0,0,0,0.14);'
        ].join('');

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #efefef;';
        const logo = document.createElement('div');
        logo.textContent = 'IG';
        logo.style.cssText = 'width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#f58529,#dd2a7b,#8134af,#515bd4);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;flex:0 0 auto;';
        const title = document.createElement('div');
        title.textContent = 'Instagram';
        title.style.cssText = 'font-weight:bold;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        header.appendChild(logo);
        header.appendChild(title);
        card.appendChild(header);

        if (data.imageUrl) {
            const imgWrap = document.createElement('a');
            imgWrap.href = data.originalUrl;
            imgWrap.target = '_blank';
            imgWrap.rel = 'noopener noreferrer';
            imgWrap.style.cssText = 'display:block;position:relative;background:#000;';
            const img = document.createElement('img');
            img.src = data.imageUrl;
            img.loading = 'lazy';
            img.decoding = 'async';
            img.style.cssText = 'display:block;width:100%;height:auto;max-height:560px;object-fit:contain;background:#000;';
            imgWrap.appendChild(img);
            const play = document.createElement('div');
            play.textContent = '▶';
            play.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:48px;height:48px;border-radius:50%;background:rgba(0,0,0,0.55);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;text-indent:3px;';
            imgWrap.appendChild(play);
            card.appendChild(imgWrap);
        }

        const body = document.createElement('div');
        body.style.cssText = 'padding:10px 12px;display:flex;flex-direction:column;gap:6px;';
        if (data.title) {
            const t = document.createElement('div');
            t.textContent = data.title;
            t.style.cssText = 'font-weight:600;overflow-wrap:anywhere;';
            body.appendChild(t);
        }
        if (data.description && data.description !== data.title) {
            const d = document.createElement('div');
            d.textContent = data.description;
            d.style.cssText = 'color:#555;overflow-wrap:anywhere;';
            body.appendChild(d);
        }
        const link = document.createElement('a');
        link.href = data.originalUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open on Instagram';
        link.style.cssText = 'color:#00376b;text-decoration:none;font-weight:bold;align-self:flex-start;';
        body.appendChild(link);
        card.appendChild(body);
        return card;
    }

    function makeIframe(shortcode, kind) {
        return root.render.fallbackFrame({
            src: `https://www.instagram.com/${encodeURIComponent(kind)}/${encodeURIComponent(shortcode)}/embed/`,
            mode: 'normal', aspect: '4/5', reason: 'instagram-iframe'
        });
    }

    root.services.register({
        key: 'instagram',
        label: 'Instagram',
        style: 'aspect-ratio:4/5;background:#111;',
        maxWidth: '430px',

        match(url) {
            return url.match(/instagram\.com\/(reel|p|tv)\/([a-zA-Z0-9_-]+)/i);
        },

        placeholderImage(ctx) {
            const kind = ctx.match[1].toLowerCase();
            const shortcode = ctx.match[2];
            return fetchThumb(`https://www.instagram.com/${kind}/${encodeURIComponent(shortcode)}/`);
        },

        async resolve(ctx) {
            const kind = ctx.match[1].toLowerCase();
            const shortcode = ctx.match[2];
            const publicUrl = `https://www.instagram.com/${kind}/${encodeURIComponent(shortcode)}/`;

            root.log.info('instagram', 'fetching page', publicUrl);
            const html = await getText(publicUrl);
            const videoUrl = extractVideoUrl(html, publicUrl);

            if (videoUrl) {
                root.log.info('instagram', 'resolved video', videoUrl);
                return { kind: 'video-url', url: videoUrl, referer: 'https://www.instagram.com/', aspect: '9/16', reason: 'instagram-video' };
            }

            const imageUrl = extractImageUrl(html, publicUrl);
            const title = extractTitle(html);
            const description = extractDescription(html);

            if (imageUrl || title || description) {
                root.log.warn('instagram', 'no video found; rendering card', shortcode);
                return { kind: 'native-node', node: makeCard({ imageUrl, title, description, originalUrl: publicUrl }), reason: 'instagram-card' };
            }

            root.log.warn('instagram', 'no useful data found; rendering unavailable card', shortcode);
            return { kind: 'native-node', node: makeCard({ title: 'Instagram preview unavailable', description: 'This post may require sign-in, app access, or account permissions.', originalUrl: publicUrl }), reason: 'instagram-unavailable-card' };
        },

        fallback(ctx) {
            return makeIframe(ctx.match[2], ctx.match[1].toLowerCase());
        }
    });
})();
