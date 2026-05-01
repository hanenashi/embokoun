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
        const width = Math.min(340, Math.max(260, window.innerWidth - margin * 2));
        const approxHeight = 440;

        menu.style.width = `${width}px`;
        menu.style.transform = '';

        let left = rect.right - width;
        left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

        let top = rect.bottom + margin;
        if (top + approxHeight > window.innerHeight) {
            top = Math.max(margin, rect.top - approxHeight - margin);
        }

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    }

    function openSettingsMenu(anchor) {
        closeSettingsMenus();

        const menu = document.createElement('div');
        menu.className = 'embokoun-settings-menu';
        menu.style.cssText = [
            'position:fixed;',
            'z-index:2147483647;',
            'width:min(340px, calc(100vw - 20px));',
            'max-height:calc(100vh - 20px);',
            'overflow:auto;',
            'background:rgba(18,18,18,0.97);',
            'color:#eee;',
            'border:1px solid rgba(255,255,255,0.22);',
            'border-radius:8px;',
            'box-shadow:0 4px 18px rgba(0,0,0,0.45);',
            'font-family:sans-serif;',
            'font-size:12px;',
            'padding:10px;',
            'box-sizing:border-box;',
            'text-align:left;',
            'line-height:1.3;'
        ].join('');

        positionSettingsMenu(menu, anchor);
        menu.addEventListener('click', ev => ev.stopPropagation());

        const title = document.createElement('div');
        title.textContent = `embokoun ${root.version}`;
        title.style.cssText = 'font-weight:bold;margin-bottom:8px;';
        menu.appendChild(title);

        menu.appendChild(selectRow('Log level', 'logLevel', ['off', 'error', 'warn', 'info', 'debug', 'trace']));

        const blobTitle = document.createElement('div');
        blobTitle.textContent = 'Blob loading';
        blobTitle.style.cssText = 'font-weight:bold;margin:10px 0 5px;';
        menu.appendChild(blobTitle);

        menu.appendChild(numberSelectRow('Blob size limit', 'blobMaxMb', [0, 25, 50, 80, 120, 200], value => value === 0 ? 'No limit' : `${value} MB`));
        menu.appendChild(numberSelectRow('Loaded blob videos', 'blobMaxActive', [1, 2, 3, 5], value => String(value), () => {
            if (root.blob && typeof root.blob.cleanup === 'function') root.blob.cleanup();
        }));

        const serviceTitle = document.createElement('div');
        serviceTitle.textContent = 'Enabled services';
        serviceTitle.style.cssText = 'font-weight:bold;margin:10px 0 5px;';
        menu.appendChild(serviceTitle);

        root.services.list.forEach(service => {
            menu.appendChild(serviceRow(service));
        });

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
        note.textContent = 'Settings are saved in this browser only.';
        note.style.cssText = 'font-size:10px;color:#888;margin-top:8px;';
        menu.appendChild(note);

        document.body.appendChild(menu);
        positionSettingsMenu(menu, anchor);
    }

    function selectRow(labelText, settingName, values) {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0;color:#ccc;';

        const label = document.createElement('span');
        label.textContent = labelText;

        const select = document.createElement('select');
        select.style.cssText = 'background:#222;color:#eee;border:1px solid #666;border-radius:4px;padding:2px 4px;';

        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            if (root.config.get(settingName) === value) option.selected = true;
            select.appendChild(option);
        });

        select.onchange = () => root.config.set(settingName, select.value);

        row.appendChild(label);
        row.appendChild(select);
        return row;
    }

    function numberSelectRow(labelText, settingName, values, labelMaker, afterChange) {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0;color:#ccc;';

        const label = document.createElement('span');
        label.textContent = labelText;

        const select = document.createElement('select');
        select.style.cssText = 'background:#222;color:#eee;border:1px solid #666;border-radius:4px;padding:2px 4px;';

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

    function serviceRow(service) {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin:5px 0;color:#ccc;';

        const label = document.createElement('span');
        label.textContent = service.label;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = root.config.isServiceEnabled(service.key);
        checkbox.onchange = () => {
            root.config.setServiceEnabled(service.key, checkbox.checked);
            if (checkbox.checked && root.dom) root.dom.scan(document.body);
        };

        row.appendChild(label);
        row.appendChild(checkbox);
        return row;
    }

    function smallButton(text) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.style.cssText = 'font-size:11px;padding:3px 7px;border-radius:4px;border:1px solid #666;background:#2b2b2b;color:#ddd;cursor:pointer;';
        return button;
    }

    function makeSettingsButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'settings';
        button.title = 'embokoun settings';
        button.setAttribute('data-embokoun-node', '1');
        button.style.cssText = [
            'position:absolute;',
            'top:6px;',
            'right:6px;',
            'z-index:5;',
            'font-family:sans-serif;',
            'font-size:10px;',
            'line-height:1;',
            'padding:4px 6px;',
            'border-radius:999px;',
            'border:1px solid rgba(255,255,255,0.25);',
            'background:rgba(0,0,0,0.62);',
            'color:#ddd;',
            'cursor:pointer;',
            'opacity:0.72;'
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
            'position:relative;',
            'width:100%;',
            service.style || 'aspect-ratio:16/9;background:#1a1a1a;',
            'background:#1a1a1a;',
            'color:#ddd;',
            'border-radius:4px;',
            'display:flex;',
            'align-items:center;',
            'justify-content:center;',
            'font-family:sans-serif;',
            'font-size:13px;',
            'text-align:center;',
            'padding:12px;',
            'box-sizing:border-box;',
            'box-shadow:0 2px 8px rgba(0,0,0,0.2);'
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
            setStatus(text) {
                status.textContent = text;
            },
            setCancel(fn) {
                cancel.onclick = ev => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    fn();
                };
            },
            disableCancel() {
                cancel.disabled = true;
                cancel.style.opacity = '0.5';
                cancel.style.cursor = 'default';
            }
        };
    }

    function applyPlaceholderPreview(placeholder, service, ctx) {
        if (!service || typeof service.placeholderImage !== 'function') return;

        let imageUrl = null;
        try {
            imageUrl = service.placeholderImage(ctx);
        } catch (e) {
            root.log.warn(service.key || 'ui', 'placeholder image failed', e);
        }

        if (!imageUrl) return;

        placeholder.style.backgroundImage = [
            'linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0.38))',
            `url("${String(imageUrl).replace(/"/g, '%22')}")`
        ].join(', ');
    }

    function makePlaceholder(service, ctx) {
        const placeholder = document.createElement('div');
        placeholder.setAttribute('data-embokoun-node', '1');
        placeholder.style.cssText = [
            'position:relative;',
            'width:100%;',
            service.style || 'aspect-ratio:16/9;background:#111;',
            'border-radius:4px;',
            'display:flex;',
            'align-items:center;',
            'justify-content:center;',
            'cursor:pointer;',
            'box-shadow:0 2px 8px rgba(0,0,0,0.2);',
            'background-position:center;',
            'background-size:cover;',
            'transition:background 0.2s ease;'
        ].join('');

        applyPlaceholderPreview(placeholder, service, ctx);
        placeholder.appendChild(makeSettingsButton());

        const button = document.createElement('div');
        button.textContent = `Load ${service.label}`;
        button.style.cssText = 'background:rgba(0,0,0,0.75);color:#fff;padding:10px 20px;border-radius:20px;font-family:sans-serif;font-size:13px;font-weight:bold;pointer-events:none;border:1px solid rgba(255,255,255,0.2);transition:all 0.2s;';
        placeholder.appendChild(button);

        placeholder.addEventListener('mouseenter', () => {
            button.style.background = 'rgba(180,0,0,0.9)';
        });

        placeholder.addEventListener('mouseleave', () => {
            button.style.background = 'rgba(0,0,0,0.75)';
        });

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
        frame.allowFullscreen = true;
        frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
        return frame;
    }

    document.addEventListener('click', ev => {
        if (!ev.target.closest || !ev.target.closest('.embokoun-settings-menu')) closeSettingsMenus();
    }, true);

    window.addEventListener('scroll', closeSettingsMenus, true);
    window.addEventListener('resize', closeSettingsMenus, true);

    root.ui = {
        openSettingsMenu,
        closeSettingsMenus,
        makeSettingsButton,
        makeSourceLink,
        makeDownloadPanel,
        makePlaceholder,
        iframe
    };
})();
