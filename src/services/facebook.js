// embokoun Facebook service
(function() {
    'use strict';

    const root = window.Embokoun;
    const metaCache = new Map();
    const thumbCache = new Map();

    function decodeHtml(str) {
        const t = document.createElement('textarea');
        t.innerHTML = String(str || '');
        return t.value;
    }

    function xmlEscape(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function absUrl(url, base) {
        if (!url) return '';
        try { return new URL(url, base || 'https://www.facebook.com/').href; }
        catch (e) { return String(url || ''); }
    }

    function looseDecodeUrl(value) {
        let out = decodeHtml(String(value || ''));
        out = out.replace(/\\u0025/g, '%');
        out = out.replace(/\\u0026/g, '&');
        out = out.replace(/\\\//g, '/');
        out = out.replace(/&amp;/g, '&');
        try { out = decodeURIComponent(out); } catch (e) { /* keep */ }
        return out;
    }

    function normalizeUrl(url) {
        try {
            const u = new URL(url);
            if (/^(m|mobile|web)\.facebook\.com$/i.test(u.hostname)) u.hostname = 'www.facebook.com';
            return u.href;
        } catch (e) {
            return url;
        }
    }

    function getText(url, timeout) {
        return new Promise((resolve, reject) => {
            root.gm.request({
                method: 'GET',
                url,
                timeout: timeout || 15000,
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Referer': 'https://www.facebook.com/',
                    'User-Agent': navigator.userAgent
                },
                onload: res => {
                    if (res.status < 200 || res.status >= 300) reject(new Error(`Facebook HTTP ${res.status}`));
                    else resolve(res.responseText || '');
                },
                onerror: () => reject(new Error('Facebook HTML request failed')),
                ontimeout: () => reject(new Error('Facebook HTML request timeout'))
            });
        });
    }

    function fetchImageBlob(url, referer) {
        return new Promise((resolve, reject) => {
            root.gm.request({
                method: 'GET',
                url,
                timeout: 15000,
                responseType: 'blob',
                headers: {
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Referer': referer || 'https://www.facebook.com/'
                },
                onload: res => {
                    if (res.status < 200 || res.status >= 300 || !res.response || !res.response.size) reject(new Error(`Facebook thumb HTTP ${res.status}`));
                    else resolve(URL.createObjectURL(res.response));
                },
                onerror: () => reject(new Error('Facebook thumb request failed')),
                ontimeout: () => reject(new Error('Facebook thumb request timeout'))
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

    function extractTitle(html) {
        const title = metaContent(html, ['og:title', 'twitter:title']);
        if (title) return title.replace(/\s+/g, ' ').trim();
        const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        return m ? decodeHtml(m[1]).replace(/\s+/g, ' ').trim() : 'Facebook';
    }

    function extractDescription(html) {
        const desc = metaContent(html, ['og:description', 'description', 'twitter:description']);
        return desc ? desc.replace(/\s+/g, ' ').trim() : '';
    }

    function extractImageUrl(html, baseUrl) {
        const img = metaContent(html, ['og:image', 'twitter:image', 'twitter:image:src']);
        return img ? absUrl(looseDecodeUrl(img), baseUrl) : '';
    }

    function looksLikeVideoUrl(url) {
        return /^https?:\/\//i.test(url) && (
            /\.mp4(?:[?#]|$)/i.test(url) ||
            /fbcdn\.net\/.*video/i.test(url) ||
            /video-.*\.xx\.fbcdn\.net/i.test(url)
        );
    }

    function extractVideoUrl(html, baseUrl) {
        if (!html) return '';
        const patterns = [
            /<meta[^>]+(?:property|name)=["']og:video(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
            /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:video(?::secure_url)?["']/i,
            /"browser_native_hd_url"\s*:\s*"([^"]+)"/i,
            /"browser_native_sd_url"\s*:\s*"([^"]+)"/i,
            /"playable_url_quality_hd"\s*:\s*"([^"]+)"/i,
            /"playable_url"\s*:\s*"([^"]+)"/i,
            /"hd_src"\s*:\s*"([^"]+)"/i,
            /"sd_src"\s*:\s*"([^"]+)"/i,
            /"video_url"\s*:\s*"([^"]+)"/i,
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
        const heading = cleanText(title || 'Facebook preview unavailable').slice(0, 70) || 'Facebook preview unavailable';
        const bodyText = cleanText(description || 'This post may require sign-in, app access, or account permissions.');
        const lines = wrapForSvg(bodyText, 48, 4);
        const lineSvg = lines.map((line, i) => `<text x="102" y="${180 + i * 40}" font-size="28" fill="#1c1e21">${xmlEscape(line)}</text>`).join('');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
<rect width="800" height="450" fill="#18191a"/>
<rect x="54" y="45" width="692" height="360" rx="18" fill="#ffffff"/>
<circle cx="113" cy="99" r="28" fill="#1877f2"/>
<text x="113" y="109" text-anchor="middle" font-size="38" font-family="Arial, sans-serif" font-weight="700" fill="#fff">f</text>
<text x="158" y="108" font-size="30" font-family="Arial, sans-serif" font-weight="700" fill="#1c1e21">Facebook</text>
<line x1="78" y1="142" x2="722" y2="142" stroke="#e4e6eb" stroke-width="2"/>
<text x="102" y="160" font-size="29" font-family="Arial, sans-serif" font-weight="700" fill="#1c1e21">${xmlEscape(heading)}</text>
<g font-family="Arial, sans-serif">${lineSvg}</g>
<text x="102" y="365" font-size="22" font-family="Arial, sans-serif" font-weight="700" fill="#1877f2">Open on Facebook</text>
</svg>`;
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    async function fetchMeta(publicUrl) {
        if (metaCache.has(publicUrl)) return metaCache.get(publicUrl);
        const promise = getText(publicUrl, 15000).then(html => ({
            html,
            videoUrl: extractVideoUrl(html, publicUrl),
            imageUrl: extractImageUrl(html, publicUrl),
            title: extractTitle(html),
            description: extractDescription(html)
        }));
        metaCache.set(publicUrl, promise);
        return promise;
    }

    async function fetchThumb(publicUrl) {
        if (thumbCache.has(publicUrl)) return thumbCache.get(publicUrl);
        const promise = (async () => {
            try {
                root.log.debug('facebook', 'fetching thumbnail metadata', publicUrl);
                const meta = await fetchMeta(publicUrl);
                if (meta.imageUrl) {
                    try {
                        root.log.debug('facebook', 'fetching thumbnail blob', meta.imageUrl);
                        const blobUrl = await fetchImageBlob(meta.imageUrl, publicUrl);
                        root.log.info('facebook', 'thumbnail blob ready', meta.imageUrl);
                        return blobUrl;
                    } catch (e) {
                        root.log.warn('facebook', 'thumbnail blob failed; using direct url', meta.imageUrl, e);
                        return meta.imageUrl;
                    }
                }
                root.log.info('facebook', 'using generated placeholder preview', publicUrl);
                return makePreviewSvg(meta.title, meta.description);
            } catch (e) {
                root.log.warn('facebook', 'thumbnail metadata failed; generated fallback', publicUrl, e);
                return makePreviewSvg('Facebook preview unavailable', 'This post may require sign-in, app access, or account permissions.');
            }
        })();
        thumbCache.set(publicUrl, promise);
        return promise;
    }

    function makeCard(data) {
        const card = document.createElement('div');
        card.setAttribute('data-embokoun-node', '1');
        card.style.cssText = [
            'width:100%;', 'max-width:550px;', 'box-sizing:border-box;', 'border:1px solid #dddfe2;',
            'border-radius:8px;', 'background:#fff;', 'color:#1c1e21;',
            'font-family:Helvetica,Arial,sans-serif;', 'font-size:14px;', 'line-height:1.35;',
            'overflow:hidden;', 'box-shadow:0 2px 8px rgba(0,0,0,0.14);'
        ].join('');

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #e4e6eb;';
        const logo = document.createElement('div');
        logo.textContent = 'f';
        logo.style.cssText = 'width:28px;height:28px;border-radius:50%;background:#1877f2;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:22px;flex:0 0 auto;font-family:Arial,sans-serif;';
        const title = document.createElement('div');
        title.textContent = 'Facebook';
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
            if (data.videoUrl) {
                const play = document.createElement('div');
                play.textContent = '▶';
                play.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:48px;height:48px;border-radius:50%;background:rgba(0,0,0,0.55);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;text-indent:3px;';
                imgWrap.appendChild(play);
            }
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
        link.textContent = 'Open on Facebook';
        link.style.cssText = 'color:#1877f2;text-decoration:none;font-weight:bold;align-self:flex-start;';
        body.appendChild(link);
        card.appendChild(body);
        return card;
    }

    root.services.register({
        key: 'facebook',
        label: 'Facebook',
        style: 'aspect-ratio:16/9;background:#18191a;',
        maxWidth: '550px',

        match(url) {
            if (!/(?:^|\.)facebook\.com|fb\.watch/i.test(url)) return null;
            if (/facebook\.com\/plugins\//i.test(url)) return null;
            return [url, normalizeUrl(url)];
        },

        placeholderImage(ctx) {
            return fetchThumb(ctx.match[1]);
        },

        async resolve(ctx) {
            const publicUrl = ctx.match[1];
            root.log.info('facebook', 'fetching page', publicUrl);
            const meta = await fetchMeta(publicUrl);

            if (meta.videoUrl) {
                root.log.info('facebook', 'resolved video', meta.videoUrl);
                return { kind: 'video-url', url: meta.videoUrl, referer: 'https://www.facebook.com/', aspect: '16/9', reason: 'facebook-video' };
            }

            root.log.warn('facebook', 'no direct video found; rendering card', publicUrl);
            return {
                kind: 'native-node',
                node: makeCard({ imageUrl: meta.imageUrl, videoUrl: meta.videoUrl, title: meta.title || 'Facebook preview unavailable', description: meta.description || 'This post may require sign-in, app access, or account permissions.', originalUrl: publicUrl }),
                reason: 'facebook-card'
            };
        },

        fallback(ctx) {
            const publicUrl = ctx.match[1];
            return makeCard({ title: 'Facebook preview unavailable', description: 'This post may require sign-in, app access, or account permissions.', originalUrl: publicUrl });
        }
    });
})();
