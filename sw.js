// Service worker de descargas: convierte lo que le va mandando la página en una descarga normal del
// navegador, trozo a trozo. Así un vídeo de varios GB se guarda sin tener que caber entero en memoria.
const pending = new Map();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('message', (e) => {
  const { id, name, type } = e.data || {};
  const port = e.ports[0];
  if (!id || !port) return; // los «ping» solo sirven para que el navegador no duerma al worker
  let wake = null;
  const stream = new ReadableStream({
    start(ctrl) {
      port.onmessage = ({ data }) => {
        if (data === 'end') ctrl.close();
        else if (data === 'abort') ctrl.error(new Error('cancelado'));
        else { ctrl.enqueue(new Uint8Array(data)); if (wake) { wake(); wake = null; } }
      };
    },
    // Pide el siguiente trozo solo cuando el navegador ha guardado el anterior (no se acumula memoria).
    pull() { return new Promise((resolve) => { wake = resolve; port.postMessage('pull'); }); },
    cancel() { port.postMessage('cancelled'); },
  });
  pending.set(id, { stream, name, type });
  port.postMessage('ready');
});

self.addEventListener('fetch', (e) => {
  const m = new URL(e.request.url).pathname.match(/__descarga\/([\w-]+)$/);
  if (!m) return; // todo lo demás va a la red sin tocar
  const d = pending.get(m[1]);
  pending.delete(m[1]);
  e.respondWith(d
    ? new Response(d.stream, { headers: {
      'Content-Type': d.type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(d.name)}`,
    } })
    : new Response('Esta descarga ya no existe', { status: 404 }));
});
