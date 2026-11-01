# Extractor M3U8

Web local para descargar vídeos HLS (`.m3u8`) y guardarlos como MP4, con una pestaña para entrar en tu servidor Emby, ver el catálogo y descargar lo que elijas.

## Uso

Necesitas [Node.js](https://nodejs.org) 18 o superior. No hay dependencias que instalar.

```bash
npm start
```

Abre http://localhost:4200.

### Desde GitHub Pages

También puedes abrirla en https://saitamaeditor.github.io/extractorm3u8/. Si tienes `npm start` arrancado en tu PC, la página de Pages lo usa automáticamente como proxy y funciona todo, Emby incluido. La primera vez el navegador puede pedirte permiso para acceder a la red local: acéptalo.

Sin el servidor arrancado, desde Pages solo funcionan los enlaces que permiten la descarga directa (CORS) y no se puede entrar en un Emby con dirección `http://`.

Si publicas tu propia copia en otra dirección, arranca el servidor indicándola:

```bash
ALLOWED_ORIGINS=https://tu-usuario.github.io npm start
```

## Funciones

**Enlace M3U8**
- Detecta las calidades y las pistas de audio separadas.
- Descarga en paralelo, reintenta los fragmentos que fallan y se puede cancelar.
- Descifra AES-128 y entiende fMP4, BYTERANGE y discontinuidades.
- Convierte de TS a MP4 en el navegador.
- Opción de guardar directamente en disco para vídeos largos.
- Vista previa y botón para copiar el comando de ffmpeg equivalente.

**Emby**
- Inicias sesión con la dirección del servidor, tu usuario y tu contraseña.
- Navegas por bibliotecas, series y temporadas, o usas el buscador.
- Eliges el idioma de audio y los subtítulos de cada vídeo, o unos preferidos para toda la lista.
- Descargas el archivo original (si tu usuario tiene permiso) o el vídeo por M3U8.
- Puedes seleccionar varios vídeos y descargarlos en cola.

## Proxy local

`server.js` sirve la página y un proxy que solo escucha en tu equipo. Sirve para los servidores que bloquean las descargas desde el navegador (CORS) o que piden un Referer. Solo lo puede usar la propia página.

## Aviso

Descarga únicamente contenido que tengas derecho a guardar. En Emby, el permiso de descarga lo decide el administrador del servidor.
