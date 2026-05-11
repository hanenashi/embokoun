// embokoun settings core
(function() {
    'use strict';

    const root = window.Embokoun;
    const KEY = 'embokoun.settings.v1';

    const defaults = {
        logLevel: 'info',
        blobMaxMb: 80,
        blobMaxActive: 3,
        showSourceLinks: false,
        parsePlainTextLinks: true,
        mediaWidthMode: 'normal',
        mediaCustomWidthPx: 900,
        placeholderMode: 'line',
        placeholderThumbs: true,
        autoLoadServices: {},
        enabledServices: {}
    };

    let settings = load();

    function cloneDefaults() {
        return JSON.parse(JSON.stringify(defaults));
    }

    function sanitizeNumberChoice(value, allowed, fallback) {
        const n = Number(value);
        return allowed.includes(n) ? n : fallback;
    }

    function sanitizeStringChoice(value, allowed, fallback) {
        return allowed.includes(value) ? value : fallback;
    }

    function sanitizeBool(value, fallback) {
        return typeof value === 'boolean' ? value : fallback;
    }

    function sanitizeCustomWidth(value, fallback) {
        const n = Number(value);
        if (!Number.isFinite(n)) return fallback;
        return Math.max(320, Math.min(1400, Math.round(n)));
    }

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return cloneDefaults();
            const parsed = JSON.parse(raw);
            const base = cloneDefaults();
            const migratedMode = parsed.placeholderMode || (parsed.telegramPlaceholderSize === 'large' || parsed.telegramPlaceholderSize === 'medium' || parsed.telegramPlaceholderSize === 'compact' ? 'tombstone' : 'line');
            const migratedThumbs = parsed.placeholderThumbs !== undefined ? parsed.placeholderThumbs : base.placeholderThumbs;

            return {
                ...base,
                ...parsed,
                logLevel: ['off', 'error', 'warn', 'info', 'debug', 'trace'].includes(parsed.logLevel) ? parsed.logLevel : base.logLevel,
                blobMaxMb: sanitizeNumberChoice(parsed.blobMaxMb, [0, 25, 50, 80, 120, 200], base.blobMaxMb),
                blobMaxActive: sanitizeNumberChoice(parsed.blobMaxActive, [1, 2, 3, 5], base.blobMaxActive),
                showSourceLinks: sanitizeBool(parsed.showSourceLinks, base.showSourceLinks),
                parsePlainTextLinks: sanitizeBool(parsed.parsePlainTextLinks, base.parsePlainTextLinks),
                mediaWidthMode: sanitizeStringChoice(parsed.mediaWidthMode, ['compact', 'normal', 'wide', 'large', 'full', 'custom'], base.mediaWidthMode),
                mediaCustomWidthPx: sanitizeCustomWidth(parsed.mediaCustomWidthPx, base.mediaCustomWidthPx),
                placeholderMode: sanitizeStringChoice(migratedMode, ['line', 'tombstone'], base.placeholderMode),
                placeholderThumbs: sanitizeBool(migratedThumbs, base.placeholderThumbs),
                autoLoadServices: {
                    ...base.autoLoadServices,
                    ...(parsed.autoLoadServices || {})
                },
                enabledServices: {
                    ...base.enabledServices,
                    ...(parsed.enabledServices || {})
                }
            };
        } catch (e) {
            return cloneDefaults();
        }
    }

    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
    }

    root.config = {
        key: KEY,
        get(name) { return settings[name]; },
        set(name, value) { settings[name] = value; save(); },
        blobMaxBytes() {
            const mb = Number(settings.blobMaxMb);
            if (mb === 0) return Infinity;
            return mb * 1024 * 1024;
        },
        mediaMaxWidth(serviceMaxWidth) {
            if (serviceMaxWidth) return serviceMaxWidth;

            const widths = {
                compact: '420px',
                normal: '550px',
                wide: '760px',
                large: '960px',
                full: '100%'
            };
            const mode = settings.mediaWidthMode || 'normal';

            if (mode === 'custom') return `${sanitizeCustomWidth(settings.mediaCustomWidthPx, defaults.mediaCustomWidthPx)}px`;
            return widths[mode] || widths.normal;
        },
        isServiceEnabled(key) { return settings.enabledServices[key] !== false; },
        setServiceEnabled(key, enabled) { settings.enabledServices[key] = !!enabled; save(); },
        isServiceAutoLoad(key) { return settings.autoLoadServices && settings.autoLoadServices[key] === true; },
        setServiceAutoLoad(key, enabled) {
            settings.autoLoadServices = settings.autoLoadServices || {};
            settings.autoLoadServices[key] = !!enabled;
            save();
        },
        reset() { settings = cloneDefaults(); save(); },
        dump() { return JSON.parse(JSON.stringify(settings)); }
    };
})();
