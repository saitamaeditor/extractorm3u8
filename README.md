# Extractor M3U8

Web local para descargar vídeos HLS (`.m3u8`) y guardarlos como MP4, con una pestaña para entrar en tu servidor Emby, ver el catálogo y descargar lo que elijas.

## Uso

Necesitas [Node.js](https://nodejs.org) 18 o superior. No hay dependencias que instalar.

```bash
npm start
```

Abre http://localhost:4200.

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
