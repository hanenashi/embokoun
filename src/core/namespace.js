// embokoun core namespace
(function() {
    'use strict';

    const root = window.Embokoun = window.Embokoun || {};

    root.version = root.version || '0.4.23-alpha';
    root.name = 'embokoun';
    root.githubUrl = 'https://github.com/hanenashi/embokoun';
    root.iconUrl = 'https://raw.githubusercontent.com/hanenashi/embokoun/main/embokoun.png';

    root.services = root.services || {
        list: [],
        register(service) {
            if (!service || !service.key || !service.label) {
                console.warn('[embokoun:services] refused invalid service', service);
                return;
            }

            const existing = this.list.find(item => item.key === service.key);
            if (existing) Object.assign(existing, service);
            else this.list.push(service);
        },
        get enabledList() {
            const config = root.config;
            return this.list.filter(service => !config || config.isServiceEnabled(service.key));
        }
    };
})();
