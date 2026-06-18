import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createImageStudioApp } from './app';
import { registerStaticClient } from './http/staticClient';
import { env } from './providers/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = createImageStudioApp();
registerStaticClient(app, __dirname);

const port = Number(process.env.PORT || 8787);
const host = env('HOST', '127.0.0.1');
app.listen(port, host, () => {
  console.log(`Image Studio proxy listening on http://${host}:${port}`);
});
