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
    tint: iosBlueLight,
    tabIconDefault: 'rgba(60,60,67,0.52)',
    tabIconSelected: iosBlueLight,
    tabBarBackground: 'rgba(255,255,255,0.72)',
    tabBarBorder: 'rgba(60,60,67,0.16)',
  },
  dark: {
    text: '#FFFFFF', // label
    secondaryText: 'rgba(235,235,245,0.6)', // secondaryLabel
    background: '#000000', // systemGroupedBackground (dark)
    surface: '#1C1C1E', // secondarySystemGroupedBackground (dark)
    separator: 'rgba(84,84,88,0.65)',
    tint: iosBlueDark,
    tabIconDefault: 'rgba(235,235,245,0.58)',
    tabIconSelected: iosBlueDark,
    tabBarBackground: 'rgba(28,28,30,0.72)',
    tabBarBorder: 'rgba(255,255,255,0.12)',
  },
};
