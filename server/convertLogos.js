import Jimp from 'jimp';
import fs from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkLogos() {
  const logosDir = join(__dirname, 'assets', 'logos');
  await fs.mkdir(logosDir, { recursive: true });

  // Expected logo files from presets.json
  const expectedLogos = [
    'best-founder-clips.png',
    'business-cracked.png',
    'the-founders-show.png',
    'founders-god.png',
    'smart-business.png',
    'the-rising-founder.png',
    'the-real-founder.png',
    'inspiring-founder.png',
    'real-india-business.png',
    'ceo-mindset-india.png',
    'startup-madness.png'
  ];

  console.log('Checking for logo files in:', logosDir);
  console.log('Supported formats: PNG, JPEG, JPG\n');

  let foundCount = 0;
  let missingCount = 0;

  for (const filename of expectedLogos) {
    const filePath = join(logosDir, filename);
    
    // Check for exact filename
    let exists = false;
    let actualPath = filePath;
    
    try {
      await fs.access(filePath);
      exists = true;
    } catch {
      // Try with different extensions
      const baseName = filename.replace(/\.(png|jpg|jpeg)$/i, '');
      const extensions = ['.png', '.jpg', '.jpeg', '.PNG', '.JPG', '.JPEG'];
      
      for (const ext of extensions) {
        const altPath = join(logosDir, baseName + ext);
        try {
          await fs.access(altPath);
          exists = true;
          actualPath = altPath;
          break;
        } catch {
          // Continue searching
        }
      }
    }

    if (exists) {
      // Verify it's a valid image
      try {
        const image = await Jimp.read(actualPath);
        const format = image.getExtension();
        console.log(`✓ Found: ${filename} (${format.toUpperCase()}, ${image.getWidth()}x${image.getHeight()})`);
        foundCount++;
      } catch (error) {
        console.log(`⚠ Found but invalid: ${filename} - ${error.message}`);
      }
    } else {
      console.log(`✗ Missing: ${filename}`);
      missingCount++;
    }
  }

  console.log(`\nSummary: ${foundCount} found, ${missingCount} missing`);
  console.log('\nTo add logos:');
  console.log('1. Place PNG or JPEG files in:', logosDir);
  console.log('2. Files can be named exactly as listed above');
  console.log('3. Or use any case variation (e.g., Best-Founder-Clips.png)');
  console.log('4. The system will automatically detect PNG, JPEG, or JPG formats');
}

checkLogos().catch(console.error);
