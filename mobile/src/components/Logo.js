// src/components/Logo.js
// Logo oficial S-doorbell (assets/logo.png). LogoMark = solo la onda+S para el centro del QR.
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const BLUE = '#2E9BE0';
const BLUE_MID = '#4FA8E5';
const BLUE_LIGHT = '#7CC6F0';

const LOGO_SRC = require('../../assets/logo.png');
const LOGO_RATIO = 3299 / 1198; // proporción del PNG oficial

// Ondas concéntricas (para el LogoMark del QR).
const Waves = ({ s }) => {
  const cx = s * 0.95;
  const cy = s * 1.0;
  const sw = s * 0.17;
  const arc = (r) => `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy - r}`;
  return (
    <Svg width={s * 1.15} height={s * 1.15}>
      <Path d={arc(s * 0.86)} stroke={BLUE_LIGHT} strokeWidth={sw} fill="none" strokeLinecap="round" />
      <Path d={arc(s * 0.57)} stroke={BLUE_MID} strokeWidth={sw} fill="none" strokeLinecap="round" />
      <Path d={arc(s * 0.30)} stroke={BLUE} strokeWidth={sw} fill="none" strokeLinecap="round" />
    </Svg>
  );
};

// Solo la marca (onda + "S"), para el centro del QR.
export const LogoMark = ({ size = 28 }) => {
  const waveUnit = size * 0.5;
  return (
    <View style={{ width: size * 0.72, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{ position: 'absolute', top: -waveUnit * 0.5, left: size * 0.02 }}>
        <Waves s={waveUnit} />
      </View>
      <Text style={{ fontSize: size, fontWeight: '900', color: BLUE, lineHeight: size * 1.04 }}>S</Text>
    </View>
  );
};

// Logo oficial completo.
const Logo = ({ size = 'md', style }) => {
  const width = size === 'lg' ? 230 : size === 'sm' ? 130 : 180;
  return (
    <Image
      source={LOGO_SRC}
      style={[{ width, height: width / LOGO_RATIO }, style]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({});

export default Logo;
