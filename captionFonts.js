/**
 * Shared caption font catalog — ASS Fontname must match the TTF/OTF name table.
 * `file` is relative to server/assets/fonts (and mirrored under public/fonts for preview).
 */
export const CAPTION_FONTS = [
  {
    id: 'Montserrat Black',
    assName: 'Montserrat Black',
    file: 'Montserrat-Black.ttf',
    cssFamily: 'Montserrat Black',
    weight: 900,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Montserrat ExtraBold',
    assName: 'Montserrat ExtraBold',
    file: 'Montserrat-ExtraBold.ttf',
    cssFamily: 'Montserrat ExtraBold',
    weight: 800,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Montserrat Bold',
    assName: 'Montserrat',
    file: 'Montserrat-Bold.ttf',
    cssFamily: 'Montserrat',
    weight: 700,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Montserrat Regular',
    assName: 'Montserrat Regular',
    file: 'Montserrat-Regular.ttf',
    cssFamily: 'Montserrat Regular',
    weight: 400,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Inter Black',
    assName: 'Inter Black',
    file: 'Inter_18pt-Black.ttf',
    cssFamily: 'Inter Black',
    weight: 900,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Inter ExtraBold',
    assName: 'Inter ExtraBold',
    file: 'Inter_18pt-ExtraBold.ttf',
    cssFamily: 'Inter ExtraBold',
    weight: 800,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Inter Bold',
    assName: 'Inter 18pt',
    file: 'Inter-Bold.ttf',
    cssFamily: 'Inter',
    weight: 700,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Poppins Bold',
    assName: 'Poppins',
    file: 'Poppins-Bold.ttf',
    cssFamily: 'Poppins',
    weight: 700,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Helvetica World Bold',
    assName: 'Helvetica World',
    file: 'HelveticaWorld-Bold.otf',
    cssFamily: 'Helvetica World',
    weight: 700,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'ITC Avant Garde Bold',
    assName: 'ITC Avant Garde Gothic',
    file: 'ITCAvantGardeGothic-Bold.otf',
    cssFamily: 'ITC Avant Garde Gothic',
    weight: 700,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Neue Haas Medium',
    assName: 'Neue Haas Grotesk Display Pro',
    file: 'NeueHaasDisplayMedium.ttf',
    cssFamily: 'Neue Haas Grotesk Display Pro',
    weight: 500,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Playfair Bold Italic',
    assName: 'Playfair Display Bold Italic',
    file: 'PlayfairDisplay-BoldItalic.ttf',
    cssFamily: 'Playfair Display Bold Italic',
    weight: 700,
    style: 'italic',
    roles: ['highlight', 'base'],
  },
  {
    id: 'Playfair SemiBold Italic',
    assName: 'Playfair Display SemiBold Italic',
    file: 'PlayfairDisplay-SemiBoldItalic.ttf',
    cssFamily: 'Playfair Display SemiBold Italic',
    weight: 600,
    style: 'italic',
    roles: ['highlight', 'base'],
  },
  {
    id: 'Playfair Black Italic',
    assName: 'Playfair Display Black',
    file: 'PlayfairDisplay-BlackItalic.ttf',
    cssFamily: 'Playfair Display Black',
    weight: 900,
    style: 'italic',
    roles: ['highlight', 'base'],
  },
  {
    id: 'Playfair Black',
    assName: 'Playfair Display Black',
    file: 'PlayfairDisplay-Black.ttf',
    cssFamily: 'Playfair Display Black',
    weight: 900,
    style: 'normal',
    roles: ['highlight', 'base'],
  },
  {
    id: 'Playfair Bold',
    assName: 'Playfair Display',
    file: 'PlayfairDisplay-Bold.ttf',
    cssFamily: 'Playfair Display',
    weight: 700,
    style: 'normal',
    roles: ['highlight', 'base'],
  },
];

export function findCaptionFont(assOrId) {
  const key = String(assOrId || '').trim();
  return CAPTION_FONTS.find((f) => f.id === key || f.assName === key || f.cssFamily === key)
    || null;
}

export function fontsForRole(role) {
  return CAPTION_FONTS.filter((f) => f.roles.includes(role));
}
