import React from 'react';
import { View, Image, ViewStyle } from 'react-native';

const APP_BG = require('../../assets/appBG.png');

export function CreamBg({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ flex: 1, backgroundColor: '#FAF9F4' }, style]}>
      <Image source={APP_BG} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} resizeMode="cover" />
      {children}
    </View>
  );
}
