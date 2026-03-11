# Logo Setup Guide

The server supports PNG and JPEG logo files. You can place logo files directly in the `server/assets/logos/` directory.

## Supported Formats
- **PNG** (.png, .PNG)
- **JPEG** (.jpg, .jpeg, .JPG, .JPEG)

## Logo File Names

Place your logo files with these exact names (case-insensitive):

1. `best-founder-clips.png` (or .jpg/.jpeg)
2. `business-cracked.png`
3. `the-founders-show.png`
4. `founders-god.png`
5. `smart-business.png`
6. `the-rising-founder.png`
7. `the-real-founder.png`
8. `inspiring-founder.png`
9. `real-india-business.png`
10. `ceo-mindset-india.png`
11. `startup-madness.png`

## How to Add Logos

1. **Prepare your logo files** in PNG or JPEG format
2. **Name them** according to the list above (case doesn't matter)
3. **Place them** in `server/assets/logos/` directory
4. **Check status** by running: `node convertLogos.js` (it will verify which logos are present)

## Example

```
server/
  assets/
    logos/
      best-founder-clips.png    ✓
      business-cracked.jpg      ✓
      the-founders-show.PNG     ✓
      founders-god.jpeg         ✓
      ...
```

## Notes

- The system automatically detects PNG, JPEG, or JPG files
- File extensions are case-insensitive
- If a logo is missing, the video will still render without it
- Logos are automatically resized according to preset rules

## Checking Logo Status

Run the logo checker:
```bash
cd server
node convertLogos.js
```

This will show which logos are present and which are missing.
