// Monitor server logs for export processing
// This script watches for export jobs and analyzes positioning calculations

import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== EXPORT MONITOR ===');
console.log('Watching for export jobs...');
console.log('Trigger an export from the frontend or API to see detailed logs\n');

// Monitor the outputs directory for new files
const outputsDir = join(__dirname, 'outputs');
let lastCheck = Date.now();

function checkForNewExports() {
  try {
    const dirs = fs.readdirSync(outputsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => ({
        name: dirent.name,
        path: join(outputsDir, dirent.name),
        mtime: fs.statSync(join(outputsDir, dirent.name)).mtime.getTime()
      }))
      .filter(dir => dir.mtime > lastCheck)
      .sort((a, b) => b.mtime - a.mtime);
    
    if (dirs.length > 0) {
      console.log(`\n✓ Found ${dirs.length} new export(s):`);
      dirs.forEach(dir => {
        const files = fs.readdirSync(dir.path);
        console.log(`  - ${dir.name}: ${files.length} file(s)`);
        files.forEach(file => {
          const filePath = join(dir.path, file);
          const stats = fs.statSync(filePath);
          console.log(`    • ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        });
      });
      lastCheck = Date.now();
    }
  } catch (error) {
    // Directory might not exist yet
  }
}

// Check every 2 seconds
setInterval(checkForNewExports, 2000);

console.log('Monitoring active. Press Ctrl+C to stop.\n');
console.log('To test export:');
console.log('1. Open frontend (if running)');
console.log('2. Upload video and select "The Rising Founder" preset');
console.log('3. Click Export');
console.log('4. Watch server console for detailed positioning logs\n');
