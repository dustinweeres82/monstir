import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, borders, shadows } from '../tokens';

interface Tab<T extends string> {
  id: T;
  icon: string;
}

interface TabBarProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onPress: (id: T) => void;
}

export function TabBar<T extends string>({ tabs, active, onPress }: TabBarProps<T>) {
  return (
    <View style={s.wrap} pointerEvents="box-none">
      <View style={s.pill}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.id}
            style={s.item}
            onPress={() => onPress(t.id)}
            activeOpacity={0.7}
          >
            <Text style={[s.icon, active === t.id && s.iconActive]}>{t.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 28,
    left: 16,
    right: 16,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 100,
    ...borders.medium,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    ...shadows.card,
  },
  item: {
    padding: 8,
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
    opacity: 0.35,
  },
  iconActive: {
    opacity: 1,
  },
});
