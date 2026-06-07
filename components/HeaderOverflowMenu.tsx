import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';

type HeaderMenuIconName = ComponentProps<typeof Ionicons>['name'];
const HEADER_ICON_COLOR = '#717983';

type HeaderOverflowAction = {
  label: string;
  iconName: HeaderMenuIconName;
  onPress: () => void;
  destructive?: boolean;
};

type HeaderOverflowMenuProps = {
  accessibilityLabel: string;
  actions: HeaderOverflowAction[];
};

export function HeaderOverflowMenu({ accessibilityLabel, actions }: HeaderOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const menuBackground = Colors.dark.menuSurface;
  const menuBorderColor = Colors.dark.glassBorder;
  const menuTextColor = Colors.dark.text;
  const menuIconColor = '#72A8FF';
  const shadowColor = '#000000';

  const runAction = (action: HeaderOverflowAction) => {
    setOpen(false);
    requestAnimationFrame(action.onPress);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => setOpen(true)}
        hitSlop={8}
        className="h-8 w-8 flex-row items-center justify-center"
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: HEADER_ICON_COLOR,
        }}>
        {[0, 1, 2].map((dot) => (
          <View
            key={dot}
            style={{
              width: 3.5,
              height: 3.5,
              borderRadius: 1.75,
              marginHorizontal: 1.8,
              backgroundColor: HEADER_ICON_COLOR,
            }}
          />
        ))}
      </Pressable>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setOpen(false)}>
        <View className="flex-1">
          <Pressable onPress={() => setOpen(false)} className="absolute inset-0 bg-black/30" />
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              top: insets.top + 52,
              right: 18,
              width: 188,
              overflow: 'hidden',
              borderRadius: 22,
              borderWidth: 1,
              borderColor: menuBorderColor,
              backgroundColor: menuBackground,
              shadowColor,
              shadowOpacity: 0.35,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 8,
            }}>
            {actions.map((action) => {
              return (
                <Pressable
                  key={action.label}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  onPress={() => runAction(action)}
                  className="flex-row items-center px-4"
                  style={{
                    alignSelf: 'stretch',
                    minHeight: 52,
                  }}>
                  <Ionicons name={action.iconName} size={20} color={menuIconColor} />
                  <Text className="ml-3" style={{ color: menuTextColor, fontSize: 17 }}>
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}
