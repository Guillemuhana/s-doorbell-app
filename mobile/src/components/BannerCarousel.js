// src/components/BannerCarousel.js
// Carrusel de banners con efecto CUBO 3D, usando Animated nativo (funciona en Expo Go).
import React, { useRef, useEffect, useState } from 'react';
import { Animated, Dimensions, Image, TouchableOpacity, StyleSheet, View } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';

const W = Dimensions.get('window').width - SPACING.lg * 2;
const H = 200;

// Para más banners: guardá assets/bannerN.png y sumalo acá.
const IMAGES = [
  require('../../assets/banner1.png'),
  require('../../assets/banner2.png'),
  require('../../assets/banner3.png'),
];

export default function BannerCarousel({ onPress }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const ref = useRef(null);
  const index = useRef(0);
  const [active, setActive] = useState(0);

  // Autoplay
  useEffect(() => {
    if (IMAGES.length < 2) return;
    const timer = setInterval(() => {
      index.current = (index.current + 1) % IMAGES.length;
      ref.current?.scrollTo({ x: index.current * W, animated: true });
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.wrap}>
      <Animated.ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: true,
            listener: (e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / W);
              index.current = i;
              if (i !== active) setActive(i);
            },
          }
        )}
      >
        {IMAGES.map((img, i) => {
          const inputRange = [(i - 1) * W, i * W, (i + 1) * W];
          const rotateY = scrollX.interpolate({
            inputRange, outputRange: ['58deg', '0deg', '-58deg'], extrapolate: 'clamp',
          });
          const translateX = scrollX.interpolate({
            inputRange, outputRange: [W * 0.28, 0, -W * 0.28], extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp',
          });
          return (
            <Animated.View key={i} style={[styles.itemWrap, { opacity, transform: [{ perspective: 900 }, { translateX }, { rotateY }] }]}>
              <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.item}>
                <Image source={img} style={styles.img} resizeMode="cover" />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      {/* Puntitos */}
      {IMAGES.length > 1 && (
        <View style={styles.dots}>
          {IMAGES.map((_, i) => (
            <View key={i} style={[styles.dot, active === i && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.lg },
  itemWrap: { width: W, height: H },
  item: { flex: 1, borderRadius: RADIUS.xl, overflow: 'hidden', backgroundColor: '#0A1526', ...SHADOWS.md },
  img: { width: '100%', height: '100%' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: SPACING.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gray300 },
  dotActive: { width: 18, backgroundColor: COLORS.primary },
});
