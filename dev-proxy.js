import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();
const target = process.env.API_BASE || 'https://o7ykvdqu5pbnr2fhtuoddbgj3y0peneo.lambda-url.us-east-1.on.aws';

app.use(cors());

app.use('/api',
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
  }),
);

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Dev proxy on http://localhost:${port} -> ${target}`);
});
