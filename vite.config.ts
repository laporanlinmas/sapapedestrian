import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment configuration to process.env at config/dev-server startup
function loadEnv() {
  const envFiles = ['.env', '.env.local'];
  envFiles.forEach(file => {
    const envPath = path.join(__dirname, file);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;
        const eqIdx = line.indexOf('=');
        if (eqIdx > -1) {
          const key = line.substring(0, eqIdx).trim();
          let val = line.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          process.env[key] = val;
        }
      });
      console.log(`[ENV] Loaded ${file} configuration successfully.`);
    }
  });
}

loadEnv();

// Vite plugin to run API handlers as local dev/preview server middleware
function localApiPlugin(): Plugin {
  const middleware = async (req: any, res: any, next: () => void) => {
    const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    if (pathname.startsWith('/api/')) {
      console.log(`[API Request]: ${req.method} ${pathname}`);
      
      // Inject Vercel-compatible helper functions
      res.status = (code: number) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return res;
      };
      res.send = (data: any) => {
        res.end(data);
        return res;
      };
      res.redirect = (statusOrUrl: number | string, targetUrl?: string) => {
        const code = typeof statusOrUrl === 'number' ? statusOrUrl : 302;
        const redirectUrl = typeof statusOrUrl === 'string' ? statusOrUrl : targetUrl;
        res.writeHead(code, { Location: redirectUrl });
        res.end();
        return res;
      };

      // Parse query parameters
      const query: Record<string, string> = {};
      parsedUrl.searchParams.forEach((val, key) => {
        query[key] = val;
      });
      req.query = query;

      try {
        // Resolve the API handler
        const endpoint = pathname.replace('/api/', '');
        const handlerPath = path.join(__dirname, 'api', `${endpoint}.ts`);
        
        if (!fs.existsSync(handlerPath)) {
          res.status(404).json({ error: `API route /api/${endpoint} not found.` });
          return;
        }

        // Dynamically import the API handler
        // Append a timestamp to query to prevent caching during dev reloading
        const { default: handler } = await import(`${handlerPath}?t=${Date.now()}`);

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              req.body = body ? JSON.parse(body) : {};
            } catch (e) {
              req.body = {};
            }
            try {
              await handler(req, res);
            } catch (err: any) {
              console.error('[API Middleware Error]:', err);
              res.status(500).json({ error: 'Server Error: ' + err.message });
            }
          });
        } else {
          try {
            await handler(req, res);
          } catch (err: any) {
            console.error('[API Middleware Error]:', err);
            res.status(500).json({ error: 'Server Error: ' + err.message });
          }
        }
      } catch (err: any) {
        console.error('[API Load Error]:', err);
        res.status(500).json({ error: 'Failed to load API route: ' + err.message });
      }
    } else {
      next();
    }
  };

  return {
    name: 'local-api-middleware',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    }
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 3001,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/analytics'],
          'vendor-ui': ['lucide-react', 'styled-components'],
          'knowledge': ['./src/lib/satgaslinmas-knowledge'],
          'chatbot': ['./src/components/ChatbotUnified'],
          'aduan': ['./src/components/AduanPanel'],
          'survey': ['./src/components/SurveySection', './src/components/SurveyPage'],
        },
      },
    },
  },
});
