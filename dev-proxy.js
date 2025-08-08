import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();
const target = process.env.API_BASE || 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod';

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
