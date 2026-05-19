import React from 'react';
import { View, Text, Image } from 'react-native';

interface MascotBannerProps {
  message: string;
  bg?: string;
}

export function MascotBanner({ message, bg = '#F3E7FE' }: MascotBannerProps) {
  return (
    <View style={{ paddingTop: 15, overflow: 'visible' }}>
      <View style={{ backgroundColor: bg, borderRadius: 20, overflow: 'visible', paddingRight: 134 }}>
        <View style={{ padding: 16, justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', lineHeight: 20, width: 150 }}>
            {message}
          </Text>
        </View>
        <Image
          source={require('../../assets/monstirs/robot monstir/robot_popout.png')}
          style={{ position: 'absolute', right: 0, top: -15, width: 134, height: 105 }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
