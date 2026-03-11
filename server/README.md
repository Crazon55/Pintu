# DSF Video Server

Server-side video processing for the DSF Video Batcher application. This server handles video export using FFmpeg, supporting all 21 presets with their specific configurations.

## Features

- ✅ All 21 presets fully configured
- ✅ Server-side video processing with FFmpeg
- ✅ Job queue system for handling multiple exports
- ✅ Progress tracking and status updates
- ✅ ZIP file export for batch downloads
- ✅ Scalable architecture (supports 200+ pages)

## Prerequisites

- Node.js 18+ 
- FFmpeg installed and available in PATH
- Redis (optional, for persistent job queue)

### Installing FFmpeg

**Windows:**
1. Download from https://ffmpeg.org/download.html
2. Extract and add to PATH
3. Or use: `choco install ffmpeg` (if Chocolatey is installed)

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

## Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Convert logo files:
```bash
node convertLogos.js
```

4. (Optional) Set up Redis for persistent job queue:
```bash
# Windows (with Chocolatey)
choco install redis-64

# macOS
brew install redis

# Linux
sudo apt-get install redis-server
```

## Configuration

Create a `.env` file in the server directory (optional):

```env
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3001` (or the port specified in `.env`).

## API Endpoints

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-12T10:00:00.000Z"
}
```

### GET `/api/presets`
Get all available presets.

**Response:**
```json
{
  "presets": [...],
  "defaults": {...}
}
```

### POST `/api/export`
Upload video and create export job.

**Request:**
- `video` (file): Video file to process
- `presets` (string): JSON array of preset IDs
- `headline` (string): Headline text (HTML supported)
- `fontScale` (string): Font scale multiplier
- `wordSpacing` (string): Word spacing multiplier
- `videoScale` (string): Video scale percentage
- `fitMode` (string): Video fit mode (cover/contain/fill)

**Response:**
```json
{
  "jobId": "123",
  "status": "queued",
  "message": "Video export job created"
}
```

### GET `/api/job/:jobId`
Get job status and progress.

**Response:**
```json
{
  "jobId": "123",
  "state": "completed",
  "progress": {
    "current": 5,
    "total": 10,
    "preset": "Business Cracked"
  },
  "result": {
    "zipPath": "/outputs/export-123.zip",
    "videoCount": 10
  }
}
```

### GET `/api/download/:jobId`
Download exported videos as ZIP file.

## Project Structure

```
server/
├── server.js           # Express server and API routes
├── videoProcessor.js   # FFmpeg video processing logic
├── jobQueue.js         # Job queue implementation
├── presets.json        # All 21 preset configurations
├── convertLogos.js     # Logo conversion script
├── assets/
│   └── logos/          # Logo PNG files
├── uploads/            # Temporary uploaded videos
├── outputs/            # Exported video files
└── temp/               # Temporary processing files
```

## Preset Configuration

All 21 presets are configured in `presets.json` with:
- Layout types (watermark, social, logo_centered)
- Aspect ratios (1:1, 4:3, 16:9, 3:4)
- Colors and styling rules
- Logo configurations
- Text rendering rules
- Special positioning and effects

## Troubleshooting

### FFmpeg not found
- Ensure FFmpeg is installed and in your PATH
- Test with: `ffmpeg -version`

### Canvas/Image processing errors
- Ensure all logo files exist in `assets/logos/`
- Run `node convertLogos.js` to generate logos

### Redis connection errors
- Server will fall back to in-memory queue if Redis is unavailable
- For production, ensure Redis is running

### Memory issues with large videos
- Increase Node.js memory: `node --max-old-space-size=4096 server.js`
- Process videos in smaller batches

## Performance

- **Client-side**: Real-time preview, limited by browser resources
- **Server-side**: Scalable, handles 200+ pages efficiently
- **Recommended**: Use server-side for production and large batches

## License

Same as main project.
