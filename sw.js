self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
    // Interceptor vacío para cumplir con los requisitos mínimos de PWA
});