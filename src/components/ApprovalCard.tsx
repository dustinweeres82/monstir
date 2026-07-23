import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { scale } from '../design-system/tokens';

const INK = '#1A1A1A';
const PURPLE = '#6B35F0';

/** One row in the "Chores to Approve" queue. Deliberately carries no dollar
 *  amount — reward figures live in the review sheet / Wallet, not the queue. */
export function ApprovalCard({ icon, iconBg, title, kidName, when, onReview }: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  kidName: string;
  when: string;
  onReview: () => void;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: scale(12),
      backgroundColor: '#FFFFFF', borderRadius: scale(14), borderWidth: 2, borderColor: INK,
      padding: scale(12),
    }}>
      <View style={{ width: scale(44), height: scale(44), borderRadius: scale(12), backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: scale(15), fontFamily: 'Inter_700Bold', color: INK }}>{title}</Text>
        <Text style={{ fontSize: scale(12), fontFamily: 'Inter_500Medium', color: '#767676', marginTop: 2 }}>{kidName} · {when}</Text>
      </View>
      <TouchableOpacity
        onPress={onReview}
        activeOpacity={0.85}
        style={{ backgroundColor: PURPLE, borderRadius: scale(10), borderWidth: 2, borderColor: INK, paddingHorizontal: scale(14), paddingVertical: scale(9) }}
      >
        <Text style={{ fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF' }}>Review</Text>
      </TouchableOpacity>
    </View>
  );
}
