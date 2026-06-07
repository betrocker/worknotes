import React from 'react';
import { Animated, ImageStyle, StyleProp, View, useWindowDimensions } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type AppSplashScreenProps = {
  compact?: boolean;
  logoStyle?: StyleProp<ImageStyle>;
  transparent?: boolean;
};

const SPLASH_LOGO = require('../assets/images/splash-logo.png');

export function AppSplashScreen({ compact = false, logoStyle, transparent = false }: AppSplashScreenProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { width } = useWindowDimensions();
  const logoSize = Math.min(width * (compact ? 0.32 : 0.38), compact ? 132 : 164);

  return (
    <View
      pointerEvents="none"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: transparent ? 'transparent' : colors.background,
      }}>
      <Animated.Image
        source={SPLASH_LOGO}
        resizeMode="contain"
        style={[
          {
            width: logoSize,
            height: logoSize,
          },
          logoStyle,
        ]}
      />
    </View>
  );
}
