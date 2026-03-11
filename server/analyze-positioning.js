// Analyze positioning calculations for "The Rising Founder" preset
// This shows what the values SHOULD be based on client-side logic

const preset = {
  name: 'The Rising Founder',
  id: 8,
  ratio: '4:3',
  headlinePosition: { x: 0, y: 0 },
  creditPosition: { x: 0, y: 0.5 }
};

// Sample input (you can adjust these)
const headline = 'The <b>trick</b> to making your employees loyal';
const fontScale = 1;
const wordSpacing = 0.25;
const videoScale = 100; // 100% = no scaling

// Constants (matching client)
const GAP = 20;
const LOGO_HEIGHT = 80; // For The Rising Founder (not Best Founder Clips or startup madness)
const FOOTER_HEIGHT = 30;
const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 1280;

// Video dimensions
let targetW = 720;
let targetH = 720 * (3 / 4); // 4:3 ratio = 540

// Text calculations (simplified - actual depends on font rendering)
// For "The trick to making your employees loyal" (without HTML tags = 38 chars)
const textLength = headline.replace(/<[^>]*>/g, '').length;
const fontSize = Math.max(10, Math.min(60, 120 - textLength * 2)) * fontScale;
const lineHeight = fontSize * 1.25; // lineSpacing
// Estimate: ~2-3 lines for this headline
const estimatedLines = Math.ceil(textLength / 25); // Rough estimate
const totalTextHeight = estimatedLines * lineHeight;

console.log('=== POSITIONING ANALYSIS FOR "THE RISING FOUNDER" ===\n');
console.log('Input:');
console.log(`  Headline: "${headline}"`);
console.log(`  Text length (no HTML): ${textLength} chars`);
console.log(`  Font scale: ${fontScale}`);
console.log(`  Video scale: ${videoScale}%`);
console.log(`  Estimated lines: ${estimatedLines}`);
console.log(`  Estimated text height: ${totalTextHeight.toFixed(1)}px\n`);

// Positioning calculations (matching client logic EXACTLY)
const hookPositionPresets = ['The Rising Founder', 'The Real Founder', 'Inspiring Founder', 'Business Cracked', 'The Founders Show'];
const isAllBoldWhite = false; // Not for The Rising Founder
const useZeroGap = hookPositionPresets.includes(preset.name);
const textToVideoGap = useZeroGap ? 0 : GAP; // Should be 0 for The Rising Founder

const hasLogoGroup = true; // The Rising Founder has logo group
const logoToTextGap = GAP; // Standard gap (not all bold white)

const textHeightForStack = totalTextHeight;
const textGapForStack = hasLogoGroup ? logoToTextGap : 0;
const logoToVideoGapForStack = 0; // Not Best Founder Clips
const logoHeightForStack = hasLogoGroup ? LOGO_HEIGHT : 0;

const totalStackHeight = logoHeightForStack + textGapForStack + textHeightForStack + logoToVideoGapForStack + textToVideoGap + targetH + GAP + FOOTER_HEIGHT;

// Start Y position to center everything vertically in 1280
const startY_Stack = (CANVAS_HEIGHT - totalStackHeight) / 2;

// Logo Group Y
const logoGroupY = startY_Stack; // Not all bold white, so no -20 offset

// Text positioning
const baseTextStartY = logoGroupY + LOGO_HEIGHT + logoToTextGap;
const headlineOffsetY = preset.headlinePosition?.y ?? 0;
const textStartY = baseTextStartY + (CANVAS_HEIGHT * (headlineOffsetY / 100));

// Video positioning
const videoTopY = textStartY + totalTextHeight + textToVideoGap;

// Video X (left edge)
const videoLeftXForCeo = 0; // Not ceo hustle advice
const videoX = videoLeftXForCeo;

// Scaled video (if videoScale != 100)
const scale = videoScale / 100;
const scaledW = Math.round(targetW * scale);
const scaledH = Math.round(targetH * scale);
const scaledX = Math.round(videoX + (targetW - scaledW) / 2);
const scaledY = Math.round(videoTopY + (targetH - scaledH) / 2);

console.log('=== EXPECTED POSITIONING VALUES ===\n');
console.log('Stack Calculations:');
console.log(`  totalStackHeight: ${totalStackHeight.toFixed(1)}px`);
console.log(`  startY_Stack: ${startY_Stack.toFixed(1)}px (centers content vertically)`);
console.log(`  logoGroupY: ${logoGroupY.toFixed(1)}px`);
console.log(`  baseTextStartY: ${logoGroupY.toFixed(1)} + ${LOGO_HEIGHT} + ${logoToTextGap} = ${baseTextStartY.toFixed(1)}px`);
console.log(`  textStartY: ${baseTextStartY.toFixed(1)} + (${CANVAS_HEIGHT} * ${headlineOffsetY}/100) = ${textStartY.toFixed(1)}px`);
console.log(`  totalTextHeight: ${totalTextHeight.toFixed(1)}px`);
console.log(`  textToVideoGap: ${textToVideoGap}px (should be 0 for The Rising Founder)`);
console.log(`\nVideo Position:`);
console.log(`  videoTopY: ${textStartY.toFixed(1)} + ${totalTextHeight.toFixed(1)} + ${textToVideoGap} = ${videoTopY.toFixed(1)}px`);
console.log(`  videoX (left edge): ${videoX}px`);
console.log(`  targetW: ${targetW}px, targetH: ${targetH.toFixed(1)}px`);
console.log(`\nScaled Video (if videoScale = ${videoScale}%):`);
console.log(`  scaledW: ${scaledW}px, scaledH: ${scaledH}px`);
console.log(`  scaledX: ${scaledX}px (left edge of scaled video)`);
console.log(`  scaledY: ${scaledY}px (top edge of scaled video)`);

console.log('\n=== WHAT TO CHECK IN SERVER LOGS ===');
console.log('When you export, look for these log lines:');
console.log('  [generateOverlay] The Rising Founder positioning (SERVER):');
console.log('  Compare the values above with the logged values.');
console.log('\nKey values to verify:');
console.log(`  ✓ videoTopY should be around ${videoTopY.toFixed(0)}px (not too low)`);
console.log(`  ✓ startY_Stack should be around ${startY_Stack.toFixed(0)}px`);
console.log(`  ✓ textStartY should be around ${textStartY.toFixed(0)}px`);
console.log(`  ✓ videoX should be ${videoX}px (left edge)`);
console.log(`  ✓ Canvas should be 720x1280`);
console.log('\nIf videoTopY is much higher (e.g., >600), the video will be too low.');
console.log('If videoTopY is correct but video still looks wrong, check FFmpeg overlay coordinates.\n');
