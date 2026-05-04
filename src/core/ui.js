// embokoun UI core
(function() {
    'use strict';

    const root = window.Embokoun;

    function closeSettingsMenus() {
        document.querySelectorAll('.embokoun-settings-menu').forEach(menu => menu.remove());
    }

    function positionSettingsMenu(menu, anchor) {
        if (!anchor || typeof anchor.getBoundingClientRect !== 'function') {
            menu.style.left = '50%';
            menu.style.top = '50%';
            menu.style.transform = 'translate(-50%, -50%)';
            return;
        }

        const rect = anchor.getBoundingClientRect();
        const margin = 8;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 320;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 320;
        const width = Math.min(460, Math.max(280, viewportWidth - margin * 2));
        const maxViewportHeight = Math.max(160, viewportHeight - margin * 2);

        menu.style.width = `${width}px`;
        menu.style.maxHeight = `${maxViewportHeight}px`;
        menu.style.overflowY = 'auto';
        menu.style.transform = '';

        let left = rect.right - width;
        left = Math.max(margin, Math.min(left, viewportWidth - width - margin));

        const naturalHeight = Math.min(menu.scrollHeight || 520, maxViewportHeight);
        const spaceBelow = Math.max(0, viewportHeight - rect.bottom - margin);
        const spaceAbove = Math.max(0, rect.top - margin);
        const openBelow = spaceBelow >= naturalHeight || spaceBelow >= spaceAbove;
        const availableHeight = Math.max(160, Math.min(maxViewportHeight, openBelow ? spaceBelow : spaceAbove));
        const height = Math.min(naturalHeight, availableHeight);
        let top = openBelow ? rect.bottom + margin : rect.top - height - margin;
        top = Math.max(margin, Math.min(top, viewportHeight - height - margin));

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.maxHeight = `${availableHeight}px`;
    }

    function openSettingsMenu(anchor) {
        closeSettingsMenus();

        const menu = document.createElement('div');
        menu.className = 'embokoun-settings-menu';
        menu.style.cssText = [
            'position:fixed;', 'z-index:2147483647;', 'width:min(460px, calc(100vw - 20px));',
            'max-height:calc(100vh - 20px);', 'overflow:auto;', 'background:rgba(18,18,18,0.97);',
            'color:#eee;', 'border:1px solid rgba(255,255,255,0.22);', 'border-radius:10px;',
            'box-shadow:0 4px 18px rgba(0,0,0,0.45);', 'font-family:sans-serif;', 'font-size:12px;',
            'padding:10px;', 'box-sizing:border-box;', 'text-align:left;', 'line-height:1.3;'
        ].join('');

        positionSettingsMenu(menu, anchor);
        menu.addEventListener('click', ev => ev.stopPropagation());

        const title = document.createElement('div');
        title.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;';
        const name = document.createElement('strong');
        name.textContent = `embokoun ${root.version}`;
        const miniClose = smallButton('×');
        miniClose.title = 'Close';
        miniClose.style.minWidth = '26px';
        miniClose.onclick = closeSettingsMenus;
        title.appendChild(name);
        title.appendChild(miniClose);
        menu.appendChild(title);

        const hero = document.createElement('div');
        hero.setAttribute('data-embokoun-settings-icon', '1');
        hero.style.cssText = 'display:flex;justify-content:center;align-items:center;margin:2px 0 12px;';

        const heroImg = document.createElement('img');
        heroImg.src = root.iconUrl || 'https://raw.githubusercontent.com/hanenashi/embokoun/main/embokoun.png';
        heroImg.alt = 'embokoun';
        heroImg.loading = 'lazy';
        heroImg.decoding = 'async';
        heroImg.style.cssText = [
            'display:block;',
            'width:min(200px, 100%);',
            'height:auto;',
            'object-fit:contain;',
            'filter:drop-shadow(0 0 8px rgba(255,200,70,0.45)) drop-shadow(0 0 26px rgba(255,184,58,0.65));'
        ].join('');

        hero.appendChild(heroImg);
        menu.appendChild(hero);

        menu.appendChild(settingsGroup('General', [
            selectRow('Log level', 'logLevel', ['off', 'error', 'warn', 'info', 'debug', 'trace']),
            checkRow('Show original links', 'showSourceLinks', () => root.dom && root.dom.scan(document.body))
        ]));

        menu.appendChild(settingsGroup('Placeholders', [
            selectRow('Mode', 'placeholderMode', ['line', 'tombstone']),
            checkRow('Fetch thumbnails', 'placeholderThumbs')
        ]));

        menu.appendChild(settingsGroup('Loading', [
            numberSelectRow('Blob size limit', 'blobMaxMb', [0, 25, 50, 80, 120, 200], value => value === 0 ? 'No limit' : `${value} MB`),
            numberSelectRow('Loaded blob videos', 'blobMaxActive', [1, 2, 3, 5], value => String(value), () => {
                if (root.blob && typeof root.blob.cleanup === 'function') root.blob.cleanup();
            })
        ]));

        menu.appendChild(servicesGroup());

        const buttons = document.createElement('div');
        buttons.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center;';

        const github = document.createElement('a');
        github.href = root.githubUrl;
        github.target = '_blank';
        github.rel = 'noopener noreferrer';
        github.textContent = 'GitHub';
        github.style.cssText = 'color:#aaa;';

        const reset = smallButton('Reset');
        reset.onclick = () => {
            root.config.reset();
            if (root.blob && typeof root.blob.cleanup === 'function') root.blob.cleanup();
            closeSettingsMenus();
            openSettingsMenu(anchor);
            root.dom && root.dom.scan(document.body);
        };

        const close = smallButton('Close');
        close.onclick = closeSettingsMenus;

        buttons.appendChild(github);
        buttons.appendChild(reset);
        buttons.appendChild(close);
        menu.appendChild(buttons);

        const note = document.createElement('div');
        note.textContent = 'Saved in this browser. Refresh to redraw existing placeholders.';
        note.style.cssText = 'font-size:10px;color:#888;margin-top:8px;';
        menu.appendChild(note);

        document.body.appendChild(menu);
        positionSettingsMenu(menu, anchor);
    }

    function settingsGroup(titleText, rows) {
        const group = document.createElement('div');
        group.style.cssText = 'border:1px solid rgba(255,255,255,0.11);border-radius:8px;margin:8px 0;padding:8px;background:rgba(255,255,255,0.035);';
        const title = document.createElement('div');
        title.textContent = titleText;
        title.style.cssText = 'font-weight:bold;color:#fff;margin:0 0 6px;';
        group.appendChild(title);
        rows.forEach(row => group.appendChild(row));
        return group;
    }

    function servicesGroup() {
        const group = document.createElement('div');
        group.style.cssText = 'border:1px solid rgba(255,255,255,0.11);border-radius:8px;margin:8px 0;padding:8px;background:rgba(255,255,255,0.035);';

        const title = document.createElement('div');
        title.textContent = 'Services';
        title.style.cssText = 'font-weight:bold;color:#fff;margin:0 0 6px;';
        group.appendChild(title);

        const head = document.createElement('div');
        head.style.cssText = 'display:grid;grid-template-columns:1fr 54px 66px;gap:6px;align-items:center;color:#888;font-size:10px;text-transform:uppercase;letter-spacing:.04em;margin:0 0 4px;';
        head.innerHTML = '<span>Service</span><span style="text-align:center;">On</span><span style="text-align:center;">Auto</span>';
        group.appendChild(head);

        root.services.list.forEach(service => group.appendChild(serviceRow(service)));
        return group;
    }

    function serviceRow(service) {
        const row = document.createElement('div');
        row.style.cssText = 'display:grid;grid-template-columns:1fr 54px 66px;gap:6px;align-items:center;padding:5px 0;border-top:1px solid rgba(255,255,255,0.07);';

        const label = document.createElement('div');
        label.textContent = service.label;
        label.title = service.key;
        label.style.cssText = 'color:#ddd;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

        const enabledWrap = centerCell();
        const enabled = compactCheckbox(root.config.isServiceEnabled(service.key));
        enabled.onchange = () => {
            root.config.setServiceEnabled(service.key, enabled.checked);
            if (enabled.checked && root.dom) root.dom.scan(document.body);
        };
        enabledWrap.appendChild(enabled);

        const autoWrap = centerCell();
        const auto = compactCheckbox(root.config.isServiceAutoLoad(service.key));
        auto.onchange = () => root.config.setServiceAutoLoad(service.key, auto.checked);
        autoWrap.appendChild(auto);

        row.appendChild(label);
        row.appendChild(enabledWrap);
        row.appendChild(autoWrap);
        return row;
    }

    function centerCell() {
        const cell = document.createElement('div');
        cell.style.cssText = 'display:flex;align-items:center;justify-content:center;';
        return cell;
    }

    function compactCheckbox(checked) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!checked;
        checkbox.style.cssText = 'width:18px;height:18px;margin:0;';
        return checkbox;
    }

    function selectRow(labelText, settingName, values, afterChange) {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0;color:#ccc;';
        const label = document.createElement('span');
        label.textContent = labelText;
        const select = document.createElement('select');
        select.style.cssText = 'background:#222;color:#eee;border:1px solid #666;border-radius:5px;padding:3px 5px;max-width:150px;';
        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            if (root.config.get(settingName) === value) option.selected = true;
            select.appendChild(option);
        });
        select.onchange = () => {
            root.config.set(settingName, select.value);
            if (typeof afterChange === 'function') afterChange();
        };
        row.appendChild(label);
        row.appendChild(select);
        return row;
    }

    function numberSelectRow(labelText, settingName, values, labelMaker, afterChange) {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0;color:#ccc;';
        const label = document.createElement('span');
        label.textContent = labelText;
        const select = document.createElement('select');
        select.style.cssText = 'background:#222;color:#eee;border:1px solid #666;border-radius:5px;padding:3px 5px;max-width:150px;';
        values.forEach(value => {
            const option = document.createElement('option');
            option.value = String(value);
            option.textContent = labelMaker ? labelMaker(value) : String(value);
            if (Number(root.config.get(settingName)) === value) option.selected = true;
            select.appendChild(option);
        });
        select.onchange = () => {
            root.config.set(settingName, Number(select.value));
            if (typeof afterChange === 'function') afterChange();
        };
        row.appendChild(label);
        row.appendChild(select);
        return row;
    }

    function checkRow(labelText, settingName, afterChange) {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0;color:#ccc;';
        const label = document.createElement('span');
        label.textContent = labelText;
        const checkbox = compactCheckbox(!!root.config.get(settingName));
        checkbox.onchange = () => {
            root.config.set(settingName, checkbox.checked);
            if (typeof afterChange === 'function') afterChange();
        };
        row.appendChild(label);
        row.appendChild(checkbox);
        return row;
    }

    function smallButton(text) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.style.cssText = 'font-size:11px;padding:3px 7px;border-radius:5px;border:1px solid #666;background:#2b2b2b;color:#ddd;cursor:pointer;';
        return button;
    }

    function makeSettingsButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'settings';
        button.title = 'embokoun settings';
        button.setAttribute('data-embokoun-node', '1');
        button.style.cssText = [
            'position:absolute;', 'top:6px;', 'right:6px;', 'z-index:5;', 'font-family:sans-serif;',
            'font-size:10px;', 'line-height:1;', 'padding:4px 6px;', 'border-radius:999px;',
            'border:1px solid rgba(255,255,255,0.25);', 'background:rgba(0,0,0,0.62);',
            'color:#ddd;', 'cursor:pointer;', 'opacity:0.72;'
        ].join('');
        button.addEventListener('click', ev => {
            ev.preventDefault();
            ev.stopPropagation();
            const old = document.querySelector('.embokoun-settings-menu');
            const wasOpen = !!old;
            closeSettingsMenus();
            if (!wasOpen) openSettingsMenu(button);
        });
        return button;
    }

    function makeSourceLink(url, serviceName) {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = `[ Open original ${serviceName} link ]`;
        a.style.cssText = 'align-self:flex-end;margin-top:6px;font-size:11px;color:#888;text-decoration:none;font-family:sans-serif;';
        return a;
    }

    function makeDownloadPanel(service, ctx) {
        const panel = document.createElement('div');
        panel.setAttribute('data-embokoun-node', '1');
        panel.style.cssText = [
            'position:relative;', 'width:100%;', service.style || 'aspect-ratio:16/9;background:#1a1a1a;',
            'background:#1a1a1a;', 'color:#ddd;', 'border-radius:4px;', 'display:flex;',
            'align-items:center;', 'justify-content:center;', 'font-family:sans-serif;', 'font-size:13px;',
            'text-align:center;', 'padding:12px;', 'box-sizing:border-box;', 'box-shadow:0 2px 8px rgba(0,0,0,0.2);'
        ].join('');
        panel.appendChild(makeSettingsButton());
        const box = document.createElement('div');
        box.style.cssText = 'display:flex;flex-direction:column;gap:8px;align-items:center;max-width:95%;';
        const status = document.createElement('div');
        status.textContent = `Loading ${service.label}...`;
        const hint = document.createElement('div');
        hint.style.cssText = 'font-size:11px;color:#aaa;';
        hint.textContent = `Safe limit: ${root.blob ? root.blob.formatBytes(root.config.blobMaxBytes()) : '?'}`;
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap;';
        const cancel = smallButton('Cancel');
        const original = document.createElement('a');
        original.href = ctx.originalUrl;
        original.target = '_blank';
        original.rel = 'noopener noreferrer';
        original.textContent = 'Open original';
        original.style.cssText = 'font-size:12px;color:#aaa;align-self:center;';
        row.appendChild(cancel);
        row.appendChild(original);
        box.appendChild(status);
        box.appendChild(hint);
        box.appendChild(row);
        panel.appendChild(box);
        return {
            panel,
            setStatus(text) { status.textContent = text; },
            setCancel(fn) {
                cancel.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); fn(); };
            },
            disableCancel() {
                cancel.disabled = true;
                cancel.style.opacity = '0.5';
                cancel.style.cursor = 'default';
            }
        };
    }

    function setPlaceholderImage(placeholder, imageUrl, serviceKey) {
        if (!imageUrl) {
            root.log.warn('ui', 'placeholder thumb empty', serviceKey || '?');
            return;
        }
        if (!placeholder) {
            root.log.warn('ui', 'placeholder thumb skipped missing node', serviceKey || '?', imageUrl);
            return;
        }

        let img = placeholder.querySelector('img[data-embokoun-placeholder-thumb="1"]');
        if (!img) {
            img = document.createElement('img');
            img.setAttribute('data-embokoun-node', '1');
            img.setAttribute('data-embokoun-placeholder-thumb', '1');
            img.loading = 'lazy';
            img.decoding = 'async';
            img.alt = '';
            img.style.cssText = [
                'position:absolute;', 'inset:0;', 'width:100%;', 'height:100%;', 'object-fit:cover;',
                'display:block;', 'border-radius:inherit;', 'opacity:0.72;', 'z-index:0;', 'pointer-events:none;',
                'background:#111;'
            ].join('');
            img.onload = () => root.log.info('ui', 'placeholder thumb loaded', serviceKey || '?', imageUrl);
            img.onerror = () => root.log.warn('ui', 'placeholder thumb image error', serviceKey || '?', imageUrl);
            placeholder.insertBefore(img, placeholder.firstChild);
        }

        img.src = imageUrl;
        placeholder.style.backgroundColor = '#111';
        root.log.info('ui', 'placeholder thumb applied', serviceKey || '?', imageUrl);
    }

    function applyPlaceholderPreview(placeholder, service, ctx) {
        const enabled = !!root.config.get('placeholderThumbs');
        root.log.debug('ui', 'placeholder preview check', service && service.key, `enabled=${enabled}`, `hasProvider=${!!(service && service.placeholderImage)}`);
        if (!enabled) return;
        if (!service || typeof service.placeholderImage !== 'function') return;

        try {
            const result = service.placeholderImage(ctx);
            root.log.debug('ui', 'placeholder provider result', service.key, result);
            if (!result) {
                root.log.warn('ui', 'placeholder provider empty', service.key);
                return;
            }
            if (typeof result.then === 'function') {
                result.then(url => setPlaceholderImage(placeholder, url, service.key)).catch(e => root.log.warn(service.key || 'ui', 'placeholder image failed', e));
            } else {
                setPlaceholderImage(placeholder, result, service.key);
            }
        } catch (e) {
            root.log.warn(service.key || 'ui', 'placeholder image failed', e);
        }
    }

    function placeholderStyleForService(service) {
        const mode = root.config.get('placeholderMode') || 'line';
        if (mode === 'line') return 'height:38px;min-height:38px;background:#15202b;max-width:360px;';
        if (service && service.key === 'instagram') return 'aspect-ratio:9/16;max-height:460px;background:#111;';
        if (service && service.key === 'telegram') return 'height:220px;min-height:180px;background:#15202b;';
        return service.style || 'aspect-ratio:16/9;background:#111;';
    }

    function makePlaceholder(service, ctx) {
        const isLine = (root.config.get('placeholderMode') || 'line') === 'line';
        root.log.debug('ui', 'make placeholder', service && service.key, `mode=${root.config.get('placeholderMode')}`, `thumbs=${root.config.get('placeholderThumbs')}`);
        const placeholder = document.createElement('div');
        placeholder.setAttribute('data-embokoun-node', '1');
        placeholder.style.cssText = [
            'position:relative;', 'width:100%;', placeholderStyleForService(service), 'border-radius:4px;',
            'display:flex;', 'align-items:center;', 'justify-content:center;', 'cursor:pointer;',
            'overflow:hidden;', 'box-shadow:0 2px 8px rgba(0,0,0,0.2);', 'background-position:center;', 'background-size:cover;',
            'transition:background 0.2s ease;', isLine ? 'padding:0 44px 0 8px;box-sizing:border-box;' : ''
        ].join('');

        applyPlaceholderPreview(placeholder, service, ctx);
        placeholder.appendChild(makeSettingsButton());

        const button = document.createElement('div');
        button.textContent = `Load ${service.label}`;
        button.style.cssText = isLine
            ? 'position:relative;z-index:2;background:rgba(0,0,0,0.62);color:#fff;padding:4px 11px;border-radius:999px;font-family:sans-serif;font-size:12px;font-weight:bold;pointer-events:none;border:1px solid rgba(255,255,255,0.16);transition:all 0.2s;text-shadow:0 1px 2px #000;'
            : 'position:relative;z-index:2;background:rgba(0,0,0,0.75);color:#fff;padding:10px 20px;border-radius:20px;font-family:sans-serif;font-size:13px;font-weight:bold;pointer-events:none;border:1px solid rgba(255,255,255,0.2);transition:all 0.2s;text-shadow:0 1px 2px #000;';
        placeholder.appendChild(button);

        placeholder.addEventListener('mouseenter', () => { button.style.background = 'rgba(180,0,0,0.9)'; });
        placeholder.addEventListener('mouseleave', () => { button.style.background = isLine ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.75)'; });
        placeholder.addEventListener('click', async () => {
            if (placeholder.dataset.loading === '1') return;
            closeSettingsMenus();
            placeholder.dataset.loading = '1';
            button.textContent = 'Loading...';
            button.style.background = 'rgba(100,100,100,0.9)';
            try {
                const node = await root.render.embed(ctx, placeholder);
                if (placeholder.isConnected) placeholder.replaceWith(node);
            } catch (e) {
                root.log.error(service.key, 'embed failed', e);
                if (placeholder.isConnected && service.fallback) placeholder.replaceWith(service.fallback(ctx));
                else button.textContent = 'Failed';
            }
        });
        return placeholder;
    }

    function iframe(src, style) {
        const frame = document.createElement('iframe');
        frame.setAttribute('data-embokoun-node', '1');
        frame.src = src;
        frame.style.cssText = `width:100%;${style || 'aspect-ratio:16/9;'}border:none;border-radius:4px;background:white;`;
        frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
        return frame;
    }

    document.addEventListener('click', ev => {
        if (!ev.target.closest || !ev.target.closest('.embokoun-settings-menu')) closeSettingsMenus();
    }, true);

    root.ui = { openSettingsMenu, closeSettingsMenus, makeSettingsButton, makeSourceLink, makeDownloadPanel, makePlaceholder, iframe };
})();
