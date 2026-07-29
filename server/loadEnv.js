import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// pm2 launches the backend with cwd=repo root, so a cwd-relative lookup misses server/.env.
// Imported first by server.js so the values exist before other modules read process.env.
config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env') });
