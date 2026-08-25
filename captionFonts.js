/**
 * Shared caption font catalog — ASS Fontname must match the TTF/OTF name table.
 * `file` is relative to server/assets/fonts (and mirrored under public/fonts for preview).
 */
export const CAPTION_FONTS = [
  // —— Montserrat ——
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
    id: 'Montserrat Medium',
    assName: 'Montserrat Medium',
    file: 'Montserrat-Medium.ttf',
    cssFamily: 'Montserrat Medium',
    weight: 500,
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

  // —— Inter ——
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
    cssFamily: 'Inter Bold Caption',
    weight: 700,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Inter Regular',
    assName: 'Inter 18pt',
    file: 'Inter-Regular.ttf',
    cssFamily: 'Inter Regular Caption',
    weight: 400,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Inter Thin',
    assName: 'Inter 18pt Thin',
    file: 'Inter-Thin.ttf',
    cssFamily: 'Inter Thin Caption',
    weight: 100,
    style: 'normal',
    roles: ['base', 'highlight'],
  },

  // —— Poppins ——
  {
    id: 'Poppins Bold',
    assName: 'Poppins',
    file: 'Poppins-Bold.ttf',
    cssFamily: 'Poppins Bold Caption',
    weight: 700,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Poppins Regular',
    assName: 'Poppins',
    file: 'Poppins-Regular.ttf',
    cssFamily: 'Poppins Regular Caption',
    weight: 400,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Poppins Thin',
    assName: 'Poppins Thin',
    file: 'Poppins-Thin.ttf',
    cssFamily: 'Poppins Thin',
    weight: 100,
    style: 'normal',
    roles: ['base', 'highlight'],
  },

  // —— Helvetica ——
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
    id: 'Helvetica Now Display ExtraBold',
    assName: 'HelveticaNowDisplay ExtraBold',
    file: 'HELVETICANOWDISPLAY-EXTRABOLD.OTF',
    cssFamily: 'Helvetica Now Display ExtraBold',
    weight: 800,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Helvetica Now Text Black',
    assName: 'HelveticaNowText Black',
    file: 'HELVETICANOWTEXT-BLACK-DEMO.TTF',
    cssFamily: 'Helvetica Now Text Black',
    weight: 900,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Helvetica Now Text Black Italic',
    assName: 'HelveticaNowText Black',
    file: 'HELVETICANOWTEXT-BLACKITALIC-DEMO.TTF',
    cssFamily: 'Helvetica Now Text Black Italic',
    weight: 900,
    style: 'italic',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Helvetica Now Text Bold',
    assName: 'HelveticaNowText Bold',
    file: 'HELVETICANOWTEXT-BOLD-DEMO.TTF',
    cssFamily: 'Helvetica Now Text Bold',
    weight: 700,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Helvetica Now Text Bold Italic',
    assName: 'HelveticaNowText Bold',
    file: 'HELVETICANOWTEXT-BOLDITALIC-DEMO.TTF',
    cssFamily: 'Helvetica Now Text Bold Italic',
    weight: 700,
    style: 'italic',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Helvetica Now Text Regular',
    assName: 'Regular',
    file: 'REGULAR.TTF',
    cssFamily: 'Helvetica Now Text Regular',
    weight: 400,
    style: 'normal',
    roles: ['base', 'highlight'],
  },

  // —— Anton ——
  // Family name is plain "Anton", so DirectWrite matches it and the burn resolves the real
  // face. 1326 glyphs — rupee, accents and curly quotes all present, unlike THE BOLD FONT.
  // Weight class is 400 even though the face is heavy, which is what keeps the generator
  // from adding a faux-bold 1 on top of it.
  {
    id: 'Anton',
    assName: 'Anton',
    file: 'Anton-Regular.ttf',
    cssFamily: 'Anton',
    weight: 400,
    style: 'normal',
    roles: ['base', 'highlight'],
  },

  // —— THE BOLD FONT ——
  // assName is the family name embedded in the file, not the filename: libass matches on
  // the internal name, and getting it wrong makes the burn fall back to another face while
  // the preview looks perfect. Free version — 121 glyphs, Latin + digits + basic punctuation
  // only, so no rupee sign, curly quotes or Devanagari.
  {
    id: 'The Bold Font',
    // The file's FAMILY name is "THE BOLD FONT (FREE VERSION)", but libass on Windows
    // resolves through DirectWrite, which will not match a name containing parentheses —
    // it silently falls back to a default sans, so the burn came out in the wrong face
    // while the preview (which loads the file directly via @font-face) looked right.
    // This is the font's full name, which DirectWrite does match.
    assName: 'THE BOLD FONT FREE VERSION',
    file: 'THEBOLDFONT-FREEVERSION.ttf',
    cssFamily: 'The Bold Font',
    weight: 700,
    style: 'normal',
    roles: ['base', 'highlight'],
  },

  // —— Garamond ——
  {
    id: 'Garamond Regular',
    assName: 'Garamond',
    file: 'GARA.TTF',
    cssFamily: 'Garamond Regular Caption',
    weight: 400,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Garamond Bold',
    assName: 'Garamond',
    file: 'GARABD.TTF',
    cssFamily: 'Garamond Bold Caption',
    weight: 700,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'Garamond Italic',
    assName: 'Garamond',
    file: 'GARAIT.TTF',
    cssFamily: 'Garamond Italic Caption',
    weight: 400,
    style: 'italic',
    roles: ['base', 'highlight'],
  },
  {
    id: 'ITC Garamond Light Italic',
    assName: 'ITC Garamond Std Lt',
    file: 'ITC GARAMOND STD LIGHT ITALIC.OTF',
    cssFamily: 'ITC Garamond Light Italic',
    weight: 300,
    style: 'italic',
    roles: ['base', 'highlight'],
  },

  // —— EB Garamond ——
  {
    id: 'EB Garamond Regular',
    assName: 'EB Garamond',
    file: 'EBGaramond-Regular.ttf',
    cssFamily: 'EB Garamond Regular',
    weight: 400,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'EB Garamond Medium',
    assName: 'EB Garamond Medium',
    file: 'EBGaramond-Medium.ttf',
    cssFamily: 'EB Garamond Medium',
    weight: 500,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'EB Garamond SemiBold',
    assName: 'EB Garamond SemiBold',
    file: 'EBGaramond-SemiBold.ttf',
    cssFamily: 'EB Garamond SemiBold',
    weight: 600,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'EB Garamond Bold',
    assName: 'EB Garamond',
    file: 'EBGaramond-Bold.ttf',
    cssFamily: 'EB Garamond Bold',
    weight: 700,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'EB Garamond ExtraBold',
    assName: 'EB Garamond ExtraBold',
    file: 'EBGaramond-ExtraBold.ttf',
    cssFamily: 'EB Garamond ExtraBold',
    weight: 800,
    style: 'normal',
    roles: ['base', 'highlight'],
  },
  {
    id: 'EB Garamond Italic',
    assName: 'EB Garamond',
    file: 'EBGaramond-Italic.ttf',
    cssFamily: 'EB Garamond Italic',
    weight: 400,
    style: 'italic',
    roles: ['base', 'highlight'],
  },
  {
    id: 'EB Garamond Medium Italic',
    assName: 'EB Garamond Medium',
    file: 'EBGaramond-MediumItalic.ttf',
    cssFamily: 'EB Garamond Medium Italic',
    weight: 500,
    style: 'italic',
    roles: ['base', 'highlight'],
  },
  {
    id: 'EB Garamond SemiBold Italic',
    assName: 'EB Garamond SemiBold',
    file: 'EBGaramond-SemiBoldItalic.ttf',
    cssFamily: 'EB Garamond SemiBold Italic',
    weight: 600,
    style: 'italic',
    roles: ['base', 'highlight'],
  },
  {
    id: 'EB Garamond Bold Italic',
    assName: 'EB Garamond',
    file: 'EBGaramond-BoldItalic.ttf',
    cssFamily: 'EB Garamond Bold Italic',
    weight: 700,
    style: 'italic',
    roles: ['base', 'highlight'],
  },
  {
    id: 'EB Garamond ExtraBold Italic',
    assName: 'EB Garamond ExtraBold',
    file: 'EBGaramond-ExtraBoldItalic.ttf',
    cssFamily: 'EB Garamond ExtraBold Italic',
    weight: 800,
    style: 'italic',
    roles: ['base', 'highlight'],
  },

  // —— Other ——
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

  // —— Playfair ——
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
  if (!key) return null;
  // Prefer exact id match so shared ASS family names (e.g. Garamond) don't collide.
  return CAPTION_FONTS.find((f) => f.id === key)
    || CAPTION_FONTS.find((f) => f.cssFamily === key)
    || CAPTION_FONTS.find((f) => f.assName === key)
    || null;
}

export function fontsForRole(role) {
  return CAPTION_FONTS.filter((f) => f.roles.includes(role));
}
