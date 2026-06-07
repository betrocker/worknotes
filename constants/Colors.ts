// iOS-like system palette (grouped backgrounds + separators + iOS blue).
const iosBlueLight = '#007AFF';
const iosBlueDark = '#0A84FF';

export default {
  light: {
    text: '#000000', // label
    secondaryText: 'rgba(60,60,67,0.6)', // secondaryLabel
    background: '#F2F2F7', // systemGroupedBackground
    surface: '#FFFFFF', // secondarySystemGroupedBackground
    separator: 'rgba(60,60,67,0.29)', // separator
    glassSurface: 'rgba(255,255,255,0.46)',
    glassSurfaceMuted: 'rgba(255,255,255,0.28)',
    glassBorder: 'rgba(60,60,67,0.10)',
    accent: '#1C60C3',
    onAccent: '#FFFFFF',
    elevatedSurface: '#EEF0F3',
    iconSurface: '#E9EEF8',
    inputSurface: 'rgba(0,0,0,0.05)',
    inputBorder: 'rgba(60,60,67,0.14)',
    successText: '#2F8C57',
    successSurface: 'rgba(47,140,87,0.10)',
    warningText: '#C26A1A',
    warningSurface: 'rgba(194,106,26,0.10)',
    tint: iosBlueLight,
    tabIconDefault: 'rgba(60,60,67,0.52)',
    tabIconSelected: iosBlueLight,
    tabBarBackground: 'rgba(255,255,255,0.72)',
    tabBarBorder: 'rgba(60,60,67,0.16)',
    onboardingBackground: '#02060A',
    onboardingMutedText: '#B8BDC8',
    onboardingTextShadow: 'rgba(0,0,0,0.25)',
    onboardingHeroOverlay: ['rgba(0,0,0,0.16)', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.68)', '#02060A'] as const,
    onboardingBottomOverlay: ['rgba(2,6,10,0)', '#02060A'] as const,
  },
  dark: {
    text: '#FFFFFF', // label
    secondaryText: 'rgba(235,235,245,0.6)', // secondaryLabel
    background: '#1D2229', // Things-like soft slate background
    surface: '#1C1C1E', // secondarySystemGroupedBackground (dark)
    menuSurface: '#32363d',
    separator: 'rgba(84,84,88,0.65)',
    glassSurface: 'rgba(28,28,30,0.54)',
    glassSurfaceMuted: 'rgba(44,44,46,0.32)',
    glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#72A8FF',
    onAccent: '#13233A',
    elevatedSurface: '#414751',
    iconSurface: '#263241',
    inputSurface: '#272D36',
    inputBorder: 'rgba(235,242,255,0.16)',
    successText: '#7AD69C',
    successSurface: 'rgba(47,140,87,0.18)',
    warningText: '#FFBF7A',
    warningSurface: 'rgba(255,191,122,0.16)',
    tint: iosBlueDark,
    tabIconDefault: 'rgba(235,235,245,0.58)',
    tabIconSelected: iosBlueDark,
    tabBarBackground: 'rgba(28,28,30,0.72)',
    tabBarBorder: 'rgba(255,255,255,0.12)',
    onboardingBackground: '#02060A',
    onboardingMutedText: '#B8BDC8',
    onboardingTextShadow: 'rgba(0,0,0,0.25)',
    onboardingHeroOverlay: ['rgba(0,0,0,0.16)', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.68)', '#02060A'] as const,
    onboardingBottomOverlay: ['rgba(2,6,10,0)', '#02060A'] as const,
  },
};
