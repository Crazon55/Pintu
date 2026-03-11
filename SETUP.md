# DSF Video Batcher - Server-Side Setup Guide

This guide will help you set up the complete server-side video processing system with all 21 presets.

## Quick Start

### 1. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd server
npm install
```

### 2. Install FFmpeg

**Windows:**
- Download from https://ffmpeg.org/download.html
- Extract and add `ffmpeg.exe` to your PATH
- Or use: `choco install ffmpeg`

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

Verify installation:
```bash
ffmpeg -version
```

### 3. Convert Logos

```bash
cd server
node convertLogos.js
```

This will create PNG logo files in `server/assets/logos/` from the SVG data URIs.

### 4. Start the Server

```bash
cd server
npm start
```

Server will run on `http://localhost:3001`

### 5. Start the Frontend

In a new terminal:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173` (or your Vite port)

## Configuration

### Server URL

The frontend connects to the server at `http://localhost:3001` by default.

To change this, create a `.env` file in the root directory:
```env
VITE_SERVER_URL=http://your-server-url:3001
```

### Server Port

To change the server port, create a `.env` file in the `server/` directory:
```env
PORT=3001
```

## Usage

1. **Upload Video**: Drag and drop or select a video file
2. **Select Presets**: Toggle which presets you want to export
3. **Edit Text**: Modify headlines and credits
4. **Choose Export Mode**:
   - **Client-Side**: Real-time preview, processes in browser
   - **Server-Side**: Scalable, handles 200+ pages efficiently (recommended)
5. **Export**: Click "Export X Videos" button

## Export Modes

### Client-Side Export
- ✅ Real-time preview
- ✅ No server required
- ❌ Limited by browser resources
- ❌ Can lag with many presets

### Server-Side Export
- ✅ Scalable (200+ pages)
- ✅ Better performance
- ✅ Progress tracking
- ✅ ZIP file download
- ❌ Requires server setup

## All 21 Presets Included

1. 101xfounders
2. bizzindia
3. Best Founder Clips
4. Business Cracked
5. The Founders Show
6. Founders God
7. Smart Business.in
8. The Rising Founder
9. The Real Founder
10. Inspiring Founder
11. Real India Business
12. CEO Mindset India
13. founderdaily
14. founderbusinesstips
15. foundersoncrack
16. kwazyfounders
17. Life Wealth Lessons
18. Business India Lessons
19. Billionaires of Bharat
20. startup madness
21. ceo hustle advice

## Troubleshooting

### "FFmpeg not found"
- Ensure FFmpeg is installed and in PATH
- Restart terminal after installation
- Test with: `ffmpeg -version`

### "Logo files not found"
- Run: `cd server && node convertLogos.js`
- Check that `server/assets/logos/` contains PNG files

### "Server connection failed"
- Ensure server is running: `cd server && npm start`
- Check server URL in frontend `.env` file
- Verify CORS is enabled (should be by default)

### "Job failed"
- Check server logs for errors
- Ensure video file is valid
- Check disk space in `server/outputs/` directory

## Project Structure

```
.
├── hello.jsx              # Main frontend component
├── server/
│   ├── server.js          # Express server
│   ├── videoProcessor.js  # FFmpeg processing
│   ├── jobQueue.js        # Job queue system
│   ├── presets.json       # All 21 presets
│   ├── convertLogos.js    # Logo converter
│   ├── assets/
│   │   └── logos/         # Logo PNG files
│   ├── uploads/           # Temporary uploads
│   ├── outputs/           # Exported videos
│   └── temp/              # Processing temp files
└── SETUP.md               # This file
```

## Next Steps

1. ✅ All presets configured
2. ✅ Server-side processing implemented
3. ✅ Frontend integration complete
4. ✅ Job queue system ready
5. 🚀 Ready to scale to 200+ pages!

## Support

For issues or questions, check:
- Server logs in terminal
- Browser console for frontend errors
- `server/README.md` for detailed API docs
