import resolvedSpecifiers from './export-smoke.js';

document.querySelector('#app').textContent = resolvedSpecifiers.join(',');
