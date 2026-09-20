const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || process.argv[2] || 3010;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.riv': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.hdr': 'image/vnd.radiance',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqUrl = req.url.split('?')[0];
  try { reqUrl = decodeURIComponent(reqUrl); } catch (e) {}

  if (reqUrl === '/' || reqUrl === '') {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(indexPath).pipe(res);
    return;
  }

  let filePath = path.join(PUBLIC_DIR, reqUrl);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const idx = path.join(filePath, 'index.html');
    if (fs.existsSync(idx)) filePath = idx;
  }

  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(filePath);

    const range = req.headers.range;
    if (range && (ext === '.mp4' || ext === '.webm' || ext === '.mp3')) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = (end - start) + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes'
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Also check in public/ or root if needed
  const fallbackPath = path.join(__dirname, '..', 'public', reqUrl);
  if (fs.existsSync(fallbackPath) && !fs.statSync(fallbackPath).isDirectory()) {
    const ext = path.extname(fallbackPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(fallbackPath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size
    });
    fs.createReadStream(fallbackPath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found: ' + reqUrl);
});

server.listen(PORT, () => {
  console.log(`🚀 Final server running at: http://localhost:${PORT}`);
});
