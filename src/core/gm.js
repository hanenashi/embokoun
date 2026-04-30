// embokoun userscript-manager compatibility adapter
(function() {
    'use strict';

    const root = window.Embokoun;

    root.gm = {
        request(details) {
            if (typeof GM_xmlhttpRequest === 'function') {
                return GM_xmlhttpRequest(details);
            }

            if (typeof GM !== 'undefined' && GM && typeof GM.xmlHttpRequest === 'function') {
                const result = GM.xmlHttpRequest(details);

                if (result && typeof result.then === 'function') {
                    result.then((res) => {
                        if (typeof details.onload === 'function') details.onload(res);
                    }).catch((err) => {
                        if (typeof details.onerror === 'function') details.onerror(err);
                    });
                }

                return result;
            }

            throw new Error('No supported GM request API found');
        },

        menuCommand(label, callback) {
            if (typeof GM_registerMenuCommand === 'function') {
                return GM_registerMenuCommand(label, callback);
            }

            if (typeof GM !== 'undefined' && GM && typeof GM.registerMenuCommand === 'function') {
                return GM.registerMenuCommand(label, callback);
            }

            return null;
        }
    };
})();
