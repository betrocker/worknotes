import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, type ImageSourcePropType, View } from 'react-native';

type AuthHeroBackdropProps = {
  source: ImageSourcePropType;
  top: number;
  left: number;
  width: number;
  height: number;
  topBleed?: number;
  imageHeightMultiplier?: number;
};

export function AuthHeroBackdrop({
  source,
  top,
  left,
  width,
  height,
  topBleed = 110,
  imageHeightMultiplier = 1.42,
}: AuthHeroBackdropProps) {
  const frameTop = top - topBleed;
  const frameHeight = height + topBleed;
  const imageHeight = frameHeight * imageHeightMultiplier;

  return (
    <View
      style={{
        position: 'absolute',
        top: frameTop,
        left,
        width,
        height: frameHeight,
        overflow: 'hidden',
      }}>
      <Image
        source={source}
        resizeMode="cover"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height: imageHeight,
          opacity: 1,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(2,6,10,0.08)',
        }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(2,6,10,0.34)', 'rgba(2,6,10,0)', 'rgba(2,6,10,0.46)']}
        locations={[0, 0.42, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['#02060A', 'rgba(2,6,10,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.22 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(2,6,10,0)', '#02060A']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: width * 0.22 }}
      />
    </View>
  );
}
