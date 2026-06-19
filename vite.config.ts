import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const viteEnv = loadEnv(mode, process.cwd(), '');
  const proxyTarget = viteEnv.IMAGE_STUDIO_PROXY_TARGET || process.env.IMAGE_STUDIO_PROXY_TARGET || 'http://127.0.0.1:8787';
  const allowedHosts = collectAllowedHosts(viteEnv);

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      allowedHosts,
      proxy: {
        '/api': proxyTarget
      }
    },
    preview: {
      allowedHosts
    },
    build: {
      outDir: 'dist/client',
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/react') || id.includes('/node_modules/react-dom')) return 'react-vendor';
          }
        }
      }
    }
  };
});

function collectAllowedHosts(viteEnv: Record<string, string>): string[] {
  const sources = [
    viteEnv.IMAGE_STUDIO_ALLOWED_HOSTS,
    viteEnv.IMAGE_STUDIO_PUBLIC_URL,
    viteEnv.IMAGE_STUDIO_ALLOWED_ORIGINS,
    process.env.IMAGE_STUDIO_ALLOWED_HOSTS,
    process.env.IMAGE_STUDIO_PUBLIC_URL,
    process.env.IMAGE_STUDIO_ALLOWED_ORIGINS
  ];

  const hosts = new Set<string>();
  for (const source of sources) {
    for (const entry of splitList(source)) {
      const host = parseHost(entry);
      if (host) hosts.add(host);
    }
  }

  return [...hosts];
}

function splitList(value: string | undefined): string[] {
  return (value ?? '').split(',').map((entry) => entry.trim()).filter(Boolean);
}

function parseHost(entry: string): string | null {
  if (!entry) return null;
  try {
    return new URL(entry).hostname;
  } catch {
    return entry.includes(':') ? entry.split(':')[0] : entry;
  }
}
