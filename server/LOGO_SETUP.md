# Logo Setup Note

The logo conversion script currently fails because Jimp doesn't support SVG data URIs directly.

**Options:**
1. **Manual conversion**: Use an online tool or ImageMagick to convert SVG data URIs to PNG
2. **Skip logos for now**: The server will work without logos - text and video will still render
3. **Use FFmpeg**: Convert SVGs using FFmpeg: `ffmpeg -i input.svg output.png`

For production, you can:
- Extract SVG data from the data URIs
- Save as .svg files
- Convert to PNG using FFmpeg or ImageMagick
- Place in `server/assets/logos/`

The server will function without logos - they're optional enhancements.
