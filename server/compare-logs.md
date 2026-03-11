# How to Compare Server Logs with Expected Values

## When You Export "The Rising Founder" Preset

After running an export, check your server console for these log sections:

### 1. Overlay Generation Logs
Look for:
```
[generateOverlay] The Rising Founder positioning (SERVER):
  - targetW: 720, targetH: 540
  - totalStackHeight: ~790
  - startY_Stack: ~245
  - logoGroupY: ~245
  - baseTextStartY: ~325
  - textStartY: ~325
  - totalTextHeight: ~100
  - videoTopY: ~425
  - videoX (left edge): 0
```

### 2. FFmpeg Positioning Logs
Look for:
```
[processVideoWithFFmpeg] The Rising Founder video positioning:
  - videoX (left edge): 0
  - videoWidth: 720, scaledW: 720
  - videoY: ~425, videoHeight: 540, scaledH: 540
  - scaledX (left edge of scaled video): 0
  - scaledY (top edge of scaled video): ~425
```

## What to Check

### ✅ Correct Values (Video Should Be Centered)
- `videoTopY` should be around **400-450px** (not 600+)
- `startY_Stack` should be around **240-250px**
- `scaledY` should match `videoTopY` (if videoScale = 100%)

### ❌ Wrong Values (Video Too Low)
- `videoTopY` > 600px → Video will be at bottom
- `startY_Stack` < 100px → Content pushed down
- `totalStackHeight` > 1000px → Stack too tall, pushes video down

## Common Issues

### Issue 1: Video at Bottom
**Symptom**: Video appears at very bottom of frame
**Check**: 
- Is `videoTopY` > 600?
- Is `totalStackHeight` too large?
- Is `textToVideoGap` not 0? (should be 0 for The Rising Founder)

### Issue 2: Logo Missing
**Symptom**: No logo in exported video
**Check**:
- Look for: `[generateOverlay] ⚠ Could not load logo`
- Check if `the-rising-founder.png` exists in `server/assets/logos/`
- Logo overlay path should be created if logo exists

### Issue 3: Positioning Mismatch
**Symptom**: Video position doesn't match client preview
**Check**:
- Compare `videoTopY` with client-side calculation
- Verify `LOGO_HEIGHT = 80` (not from preset.rules)
- Check `textToVideoGap = 0` for The Rising Founder

## Quick Fix Commands

```bash
# Check latest export
cd server
Get-ChildItem outputs -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1

# Check logo files
Get-ChildItem assets/logos

# Run positioning analysis
node analyze-positioning.js
```
