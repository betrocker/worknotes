import React from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

type AppSplashScreenProps = {
  hideMascot?: boolean;
};

export function AppSplashScreen({ hideMascot = false }: AppSplashScreenProps) {
  const { t } = useTranslation();

  return (
    <LinearGradient
      colors={['#A9D6FF', '#6AAEFF', '#2B7DED', '#053A9A']}
      locations={[0, 0.32, 0.68, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}>
      <View className="flex-1 items-center justify-center overflow-hidden">
        <Text
          style={{
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
        </Text>

        {!hideMascot ? (
          <Image
            source={require('../assets/images/maskotavawe.png')}
            resizeMode="contain"
            style={{
              width: 420,
              height: 420,
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
