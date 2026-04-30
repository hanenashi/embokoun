// embokoun settings core
(function() {
    'use strict';

    const root = window.Embokoun;
    const KEY = 'embokoun.settings.v1';

    const defaults = {
        logLevel: 'info',
        enabledServices: {}
    };

    let settings = load();

    function cloneDefaults() {
        return JSON.parse(JSON.stringify(defaults));
    }

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return cloneDefaults();
            const parsed = JSON.parse(raw);
            return {
                ...cloneDefaults(),
                ...parsed,
                enabledServices: {
                    ...cloneDefaults().enabledServices,
                    ...(parsed.enabledServices || {})
                }
            };
        } catch (e) {
            return cloneDefaults();
        }
    }

    function save() {
        try {
            localStorage.setItem(KEY, JSON.stringify(settings));
        } catch (e) {
            // ignore
        }
    }

    root.config = {
        key: KEY,

        get(name) {
            return settings[name];
        },

        set(name, value) {
            settings[name] = value;
            save();
        },

        isServiceEnabled(key) {
            return settings.enabledServices[key] !== false;
        },

        setServiceEnabled(key, enabled) {
            settings.enabledServices[key] = !!enabled;
            save();
        },

        reset() {
            settings = cloneDefaults();
            save();
        },

        dump() {
            return JSON.parse(JSON.stringify(settings));
        }
    };
})();
