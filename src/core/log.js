// embokoun logging core
(function() {
    'use strict';

    const root = window.Embokoun;
    const order = { off: 0, error: 1, warn: 2, info: 3, debug: 4, trace: 5 };

    function currentLevel() {
        return root.config ? root.config.get('logLevel') : 'info';
    }

    function can(level) {
        const active = order[currentLevel()] ?? order.info;
        return (order[level] || 0) <= active && active > 0;
    }

    function emit(level, area, args) {
        if (!can(level)) return;
        const prefix = `[embokoun:${area || 'core'}]`;
        const fn = console[level] || console.log;
        fn.call(console, prefix, ...args);
    }

    root.log = {
        error(area, ...args) { emit('error', area, args); },
        warn(area, ...args) { emit('warn', area, args); },
        info(area, ...args) { emit('info', area, args); },
        debug(area, ...args) { emit('debug', area, args); },
        trace(area, ...args) { emit('trace', area, args); }
    };
})();
