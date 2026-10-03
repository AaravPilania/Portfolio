// node scratch/main-v12/serve.js <overlay> <port> [upstream=3010] -> the dev site with files from <overlay> swapped in;
// with before-root/ (HEAD's copies of the files this change touches) it runs the pre-change site beside final/
const http = require('http'), fs = require('fs'), path = require('path');
const OVER = path.resolve(process.argv[2] || 'scratch/main-v12/before-root'), PORT = +process.argv[3] || 3020, UP = +process.argv[4] || 3010;
const T = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css' };
http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(OVER, p);
    if (f.startsWith(OVER) && fs.existsSync(f) && fs.statSync(f).isFile()) {
        res.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        return fs.createReadStream(f).pipe(res);
    }
    const up = http.request({ host: '::1', port: UP, path: req.url, method: req.method, headers: req.headers }, (r) => {
        res.writeHead(r.statusCode, r.headers);
        r.pipe(res);
    });
    up.on('error', () => { res.writeHead(502); res.end(); });
    req.pipe(up);
}).listen(PORT, () => console.log('overlay ' + OVER + ' on ' + PORT + ' -> ' + UP));
