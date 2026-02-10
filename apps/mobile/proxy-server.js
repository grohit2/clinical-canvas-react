// Simple proxy server to fix duplicate CORS headers
const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;
const TARGET_HOST = 'kfzsv6at3amrxzl5kzuehljfju0rhkup.lambda-url.ap-south-1.on.aws';

const server = http.createServer((req, res) => {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  const options = {
    hostname: TARGET_HOST,
    port: 443,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: TARGET_HOST,
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    // Build clean headers - remove duplicate CORS
    const headers = {};
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      if (key.toLowerCase() === 'access-control-allow-origin') continue;
      if (key.toLowerCase() === 'access-control-allow-methods') continue;
      if (key.toLowerCase() === 'access-control-allow-headers') continue;
      headers[key] = value;
    }

    // Set single CORS headers
    headers['Access-Control-Allow-Origin'] = '*';
    headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization';

    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    console.error('Proxy error:', e.message);
    res.writeHead(500);
    res.end('Proxy error');
  });

  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`CORS Proxy running at http://localhost:${PORT}`);
  console.log(`Proxying to: https://${TARGET_HOST}`);
});
