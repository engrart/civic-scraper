// src/lib/theme.ts
// All colors used in the app. Supports light and dark mode.

export const Colors = {
  // Brand purple (always purple regardless of mode)
  purple900: '#26215C',
  purple800: '#3C3489',
  purple700: '#534AB7',
  purple600: '#7F77DD',
  purple100: '#CECBF6',
  purple50:  '#EEEDFE',

  // Light mode
  light: {
    background:       '#F2F2F7',
    card:             '#FFFFFF',
    cardBorder:       'rgba(0,0,0,0.08)',
    text:             '#000000',
    textSecondary:    '#6B6B6B',
    textTertiary:     '#ADADAD',
    separator:        'rgba(0,0,0,0.1)',
  },

  // Dark mode
  dark: {
    background:       '#1C1C1E',
    card:             '#2C2C2E',
    cardBorder:       'rgba(255,255,255,0.08)',
    text:             '#FFFFFF',
    textSecondary:    '#ABABAB',
    textTertiary:     '#6B6B6B',
    separator:        'rgba(255,255,255,0.1)',
  },

  // Category badge colors (always same)
  category: {
    vote:      { bg: '#FCEBEB', text: '#A32D2D' },
    meeting:   { bg: '#E6F1FB', text: '#185FA5' },
    news:      { bg: '#EAF3DE', text: '#3B6D11' },
    filing:    { bg: '#FAEEDA', text: '#854F0B' },
    event:     { bg: '#FBEAF0', text: '#993556' },
    fundraiser:{ bg: '#FBEAF0', text: '#993556' },
    other:     { bg: '#F1EFE8', text: '#5F5E5A' },
  },
};
