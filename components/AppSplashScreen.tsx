import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

type AppSplashScreenProps = {
  hideMascot?: boolean;
};

export function AppSplashScreen({ hideMascot = false }: AppSplashScreenProps) {
  const { t } = useTranslation();
  const titleAnim = useRef(new Animated.Value(0)).current;
  const mascotAnim = useRef(new Animated.Value(0)).current;
  const mascotFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    titleAnim.setValue(0);
    mascotAnim.setValue(0);
    mascotFloat.setValue(0);

    const entrance = Animated.parallel([
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(mascotAnim, {
        toValue: 1,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    let floating: Animated.CompositeAnimation | null = null;

    entrance.start(() => {
      if (hideMascot) return;
      floating = Animated.loop(
        Animated.sequence([
          Animated.timing(mascotFloat, {
            toValue: -5,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(mascotFloat, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      floating.start();
    });

    return () => {
      entrance.stop();
      floating?.stop();
      mascotFloat.stopAnimation();
    };
  }, [hideMascot, mascotAnim, mascotFloat, titleAnim]);

  const titleOpacity = titleAnim;
  const titleTranslateY = titleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  const mascotOpacity = mascotAnim;
  const mascotScale = mascotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  return (
    <LinearGradient
      colors={['#A9D6FF', '#6AAEFF', '#2B7DED', '#053A9A']}
      locations={[0, 0.32, 0.68, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}>
      <View className="flex-1 items-center justify-center overflow-hidden">
        <Animated.Text
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
            marginBottom: 8,
            marginTop: -80,
            fontSize: 48,
            fontWeight: '800',
            letterSpacing: 2.5,
            color: '#FFFFFF',
            textShadowColor: 'rgba(6, 26, 90, 0.35)',
            textShadowOffset: { width: 0, height: 4 },
            textShadowRadius: 10,
          }}>
          TEFTER
        </Animated.Text>

        {!hideMascot ? (
          <Animated.Image
            source={require('../assets/images/maskotavawe.png')}
            resizeMode="contain"
            style={{
              width: 420,
              height: 420,
              opacity: mascotOpacity,
              transform: [{ scale: mascotScale }, { translateY: mascotFloat }],
            }}
          />
        ) : (
          <View style={{ width: 420, height: 420 }} />
        )}

        <View className="absolute bottom-12 items-center">
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text className="mt-3 text-base text-white/95">{t('splash.preparing')}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}
