// Test script to verify export functionality
import fs from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testExport() {
  console.log('=== TESTING EXPORT FUNCTIONALITY ===\n');
  
  // Check if server is running
  try {
    const response = await fetch('http://localhost:3001/health');
    const data = await response.json();
    console.log('✓ Server is running:', data);
  } catch (error) {
    console.error('✗ Server is not running on port 3001');
    console.error('Please start the server: cd server && node server.js');
    return;
  }
  
  // Check presets endpoint
  try {
    const response = await fetch('http://localhost:3001/api/presets');
    const presets = await response.json();
    console.log(`✓ Presets loaded: ${presets.presets.length} presets available`);
    
    // Find "The Rising Founder" preset
    const risingFounder = presets.presets.find(p => p.name === 'The Rising Founder');
    if (risingFounder) {
      console.log(`✓ Found "The Rising Founder" preset (ID: ${risingFounder.id})`);
    } else {
      console.log('⚠ "The Rising Founder" preset not found');
    }
  } catch (error) {
    console.error('✗ Error fetching presets:', error.message);
    return;
  }
  
  // Check if there's a test video file
  const testVideoPath = join(__dirname, 'test-video.mp4');
  try {
    await fs.access(testVideoPath);
    console.log('✓ Test video file found');
    console.log('\nTo test full export:');
    console.log('1. Open http://localhost:3000 (or the frontend URL)');
    console.log('2. Upload a video file');
    console.log('3. Select "The Rising Founder" preset');
    console.log('4. Click Export');
    console.log('\nOr use curl/Postman to POST to http://localhost:3001/api/export');
  } catch {
    console.log('⚠ No test video file found at:', testVideoPath);
    console.log('\nTo test export:');
    console.log('1. Place a test video file at:', testVideoPath);
    console.log('2. Or use the frontend at http://localhost:3000');
    console.log('3. Or use curl/Postman to POST to http://localhost:3001/api/export');
  }
  
  // Check logo files
  const logosDir = join(__dirname, 'assets', 'logos');
  try {
    const files = await fs.readdir(logosDir);
    console.log(`\n✓ Logo directory exists: ${logosDir}`);
    console.log(`  Found ${files.length} logo file(s):`, files);
    
    if (files.includes('the-rising-founder.png')) {
      console.log('  ✓ the-rising-founder.png found');
    } else {
      console.log('  ⚠ the-rising-founder.png NOT found');
      console.log('  → Logo will not appear in exported video');
    }
  } catch (error) {
    console.log(`\n⚠ Logo directory not found: ${logosDir}`);
    console.log('  → Logos will not appear in exported videos');
  }
  
  console.log('\n=== TEST COMPLETE ===');
  console.log('\nNext steps:');
  console.log('1. Check server logs for detailed positioning calculations');
  console.log('2. Test export via frontend or API');
  console.log('3. Review debug logs in server console for videoTopY, videoX, etc.');
}

testExport().catch(console.error);
