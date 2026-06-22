// src/components/Logo.js
// Wordmark S-doorbell. Placeholder vectorial hasta tener el PNG oficial en assets/logo.png.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

const Logo = ({ size = 'md', showTagline = true, style }) => {
  const scale = size === 'lg' ? 1.4 : size === 'sm' ? 0.75 : 1;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <Ionicons name="wifi" size={22 * scale} color={COLORS.brand} style={styles.wave} />
        <Text style={[styles.word, { fontSize: 28 * scale }]}>
          <Text style={styles.s}>S</Text>
          <Text style={styles.rest}>-doorbell</Text>
        </Text>
      </View>
      {showTagline && (
        <Text style={[styles.tagline, { fontSize: 10 * scale }]}>TIMBRE DIGITAL</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  wave: { marginRight: 2, transform: [{ rotate: '-45deg' }] },
  word: { fontWeight: '800', letterSpacing: -0.5 },
  s: { color: COLORS.brand, fontWeight: '900' },
  rest: { color: COLORS.brand },
  tagline: { color: COLORS.gray500, letterSpacing: 3, marginTop: 2, fontWeight: '600' },
});

export default Logo;
