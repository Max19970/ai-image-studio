import { loadImageStudioEnv } from './env/loadEnv';

const envLoad = loadImageStudioEnv();
if (envLoad.files.length > 0) {
  console.log(`Image Studio loaded environment from ${envLoad.files.join(', ')}`);
}

await import('./index');
