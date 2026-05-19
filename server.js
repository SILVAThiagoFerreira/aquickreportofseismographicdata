import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, 'http://localhost');
  const requestPath = requestUrl.pathname === '/' ? 'index.html' : decodeURIComponent(requestUrl.pathname.replace(/^\/+/, ''));
  const filePath = path.join(__dirname, requestPath);
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.pdf': 'application/pdf'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

const port = Number.parseInt(process.env.PORT ?? '8080', 10) || 8080;
server.listen(port, () => console.log(`Server running on http://localhost:${port}`));
