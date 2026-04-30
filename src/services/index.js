// embokoun services index
(function() {
    'use strict';

    const root = window.Embokoun;
    root.log.info('services', 'registered services', root.services.list.map(service => service.key));
})();
