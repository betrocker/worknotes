/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.125rem' }], // 13px
        sm: ['0.9375rem', { lineHeight: '1.375rem' }], // 15px
        base: ['1.0625rem', { lineHeight: '1.5rem' }], // 17px
        lg: ['1.1875rem', { lineHeight: '1.75rem' }], // 19px
        xl: ['1.3125rem', { lineHeight: '1.875rem' }], // 21px
        'app-display': ['2rem', { lineHeight: '2.375rem' }], // 32/38
        'app-section': ['1.25rem', { lineHeight: '1.625rem' }], // 20/26
        'app-row': ['1rem', { lineHeight: '1.375rem' }], // 16/22
        'app-row-lg': ['1.1875rem', { lineHeight: '1.625rem' }], // 19/26
        'app-meta-lg': ['0.875rem', { lineHeight: '1.25rem' }], // 14/20
        'app-subtitle': ['0.9375rem', { lineHeight: '1.375rem' }], // 15/22
        'app-meta': ['0.8125rem', { lineHeight: '1.125rem' }], // 13/18
        'app-body': ['1rem', { lineHeight: '1.5rem' }], // 16/24
      },
      fontFamily: {
        mono: ['SpaceMono'],
      },
    },
  },
  plugins: [],
};
