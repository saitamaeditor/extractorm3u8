// Servidor local del descargador M3U8: sirve la página y un proxy que evita
// los bloqueos CORS y permite enviar Referer/Origin. Sin dependencias.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 4200;
const HOST = '127.0.0.1';
const INDEX = path.join(__dirname, 'index.html');

// Reutiliza conexiones con el servidor del vídeo: evita un handshake TLS por fragmento.
const agents = {
  'http:': new http.Agent({ keepAlive: true, maxSockets: 64 }),
  'https:': new https.Agent({ keepAlive: true, maxSockets: 64 }),
};

// Solo la propia página (localhost, 127.0.0.1, [::1] y los sN.localhost del reparto) y la copia
// publicada en GitHub Pages pueden usar el proxy: así otras webs que abras no pueden aprovecharlo.
// Para otra dirección: ALLOWED_ORIGINS=https://tu-usuario.github.io npm start
const LOCAL_HOST = new RegExp(`^(localhost|127\\.0\\.0\\.1|\\[::1\\]|s\\d+\\.localhost):${PORT}$`);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://saitamaeditor.github.io').split(',').map((s) => s.trim()).filter(Boolean);
const isLocalOrigin = (o) => {
  if (ALLOWED_ORIGINS.includes(o)) return true;
  try { return LOCAL_HOST.test(new URL(o).host); } catch { return false; }
};

// Cabeceras de la página que se reenvían al servidor del vídeo (Emby usa X-Emby-*).
const FORWARD = ['range', 'content-type', 'x-emby-authorization', 'x-emby-token'];

function cors(req) {
  const h = {
    'Access-Control-Allow-Headers': 'Range, Content-Type, X-Emby-Authorization, X-Emby-Token',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type, Content-Disposition, X-Final-Url',
    'Vary': 'Origin',
    // Chrome pide permiso a la web de GitHub Pages para hablar con tu PC (red local).
    'Access-Control-Allow-Private-Network': 'true',
  };
  if (req.headers.origin && isLocalOrigin(req.headers.origin)) h['Access-Control-Allow-Origin'] = req.headers.origin;
  return h;
}

function proxy(req, res, target, extra, redirects = 0, body = null) {
  let url;
  try { url = new URL(target); } catch { return fail(req, res, 400, 'URL no válida'); }
  if (!/^https?:$/.test(url.protocol)) return fail(req, res, 400, 'Solo http/https');

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
    'Accept': '*/*',
  };
  if (extra.referer) headers['Referer'] = extra.referer;
  if (extra.origin) headers['Origin'] = extra.origin;
  for (const h of FORWARD) if (req.headers[h]) headers[h] = req.headers[h];

  const lib = url.protocol === 'https:' ? https : http;
  const method = body ? 'POST' : extra.method === 'DELETE' ? 'DELETE' : 'GET';
  // 2 minutos sin recibir nada antes de dar el servidor por perdido (Emby puede tardar al convertir).
  const up = lib.request(url, { method, headers, timeout: 120000, agent: agents[url.protocol] }, (r) => {
    if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location && redirects < 5) {
      r.resume();
      const keep = r.statusCode === 307 || r.statusCode === 308; // solo estas conservan el POST
      return proxy(req, res, new URL(r.headers.location, url).href, extra, redirects + 1, keep ? body : null);
    }
    const out = { ...cors(req), 'X-Final-Url': url.href };
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'content-disposition']) {
      if (r.headers[h]) out[h] = r.headers[h];
    }
    // ?download=nombre: obliga a guardar como archivo (si no, el navegador intentaría reproducir el vídeo).
    if (extra.filename && r.statusCode < 300) {
      out['content-disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(extra.filename.replace(/[\\/:*?"<>|\r\n]+/g, '_'))}`;
    }
    res.writeHead(r.statusCode, out);
    r.pipe(res);
  });
  up.end(body || undefined);
  up.on('timeout', () => up.destroy(new Error('Tiempo de espera agotado')));
  up.on('error', (e) => { if (!res.headersSent) fail(req, res, 502, e.message); else res.destroy(); });
  // Si la página cancela o cierra, corta también la descarga con el servidor del vídeo.
  res.on('close', () => { if (!res.writableFinished) up.destroy(); });
}

function fail(req, res, code, msg) {
  if (res.headersSent || res.destroyed) return;
  res.writeHead(code, { ...cors(req), 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(msg);
}

function handle(req, res) {
  // Rechaza nombres de host ajenos (protección contra DNS rebinding).
  if (!LOCAL_HOST.test(req.headers.host || '')) return fail(req, res, 403, 'Host no permitido');
  const u = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') { res.writeHead(204, cors(req)); return res.end(); }
  if (u.pathname === '/health') { res.writeHead(200, cors(req)); return res.end('ok'); }
  if (u.pathname === '/proxy') {
    if (req.headers.origin && !isLocalOrigin(req.headers.origin)) return fail(req, res, 403, 'Origen no permitido');
    const target = u.searchParams.get('url') || '';
    const extra = { referer: u.searchParams.get('referer') || '', origin: u.searchParams.get('origin') || '', filename: u.searchParams.get('download') || '', method: req.method };
    if (req.method !== 'POST') return proxy(req, res, target, extra);
    // POST (inicio de sesión en Emby): se lee el cuerpo entero, máximo 1 MB.
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > 1048576) req.destroy(); else chunks.push(c); });
    req.on('end', () => proxy(req, res, target, extra, 0, Buffer.concat(chunks)));
    return;
  }
  if (u.pathname === '/' || u.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return fs.createReadStream(INDEX).pipe(res);
  }
  if (u.pathname === '/sw.js') { // service worker que guarda las descargas grandes a trozos
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
    return fs.createReadStream(path.join(__dirname, 'sw.js')).pipe(res);
  }
  fail(req, res, 404, 'No encontrado');
}

const server = http.createServer(handle);
server.keepAliveTimeout = 30000;
server.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE' ? `El puerto ${PORT} ya está en uso (¿ya lo tienes abierto?).` : e.message);
  process.exit(1);
});
server.listen(PORT, HOST, () => {
  console.log(`Descargador M3U8 en http://localhost:${PORT}`);
});
// s0.localhost, s1.localhost… pueden resolverse a ::1; escucha también ahí (solo local).
const server6 = http.createServer(handle);
server6.keepAliveTimeout = 30000;
server6.on('error', () => {});
server6.listen(PORT, '::1');
