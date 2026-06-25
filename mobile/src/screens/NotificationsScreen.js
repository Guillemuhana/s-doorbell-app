// src/screens/NotificationsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  useColorScheme, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { eventosAPI } from '../utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const EventItem = ({ evento, onDelete, isDark }) => {
  const textColor = isDark ? COLORS.white : COLORS.gray900;
  const mutedColor = isDark ? COLORS.gray400 : COLORS.gray500;

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

    let dateLabel;
    if (d.toDateString() === today.toDateString()) dateLabel = 'Hoy';
    else if (d.toDateString() === yesterday.toDateString()) dateLabel = 'Ayer';
    else dateLabel = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });

    const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
    return { dateLabel, time };
  };

  const { dateLabel, time } = formatDateTime(evento.createdAt);

  const typeConfig = {
    timbrazo: { icon: 'bell', label: 'Timbrazo', color: COLORS.primary },
    vista_qr: { icon: 'eye', label: 'QR Escaneado', color: COLORS.info },
    login: { icon: 'key', label: 'Login', color: COLORS.success },
    logout: { icon: 'door', label: 'Logout', color: COLORS.gray400 },
  };

  const config = typeConfig[evento.tipo] || typeConfig.timbrazo;

  return (
    <View style={[styles.eventItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', borderLeftColor: config.color }]}>
      <View style={[styles.eventIconBg, { backgroundColor: `${config.color}18` }]}>
        <MaterialCommunityIcons name={config.icon} size={22} color={config.color} />
      </View>
      <View style={styles.eventBody}>
        <View style={styles.eventHeader}>
          <Text style={[styles.eventType, { color: config.color }]}>{config.label}</Text>
          <Text style={[styles.eventTime, { color: mutedColor }]}>{time} hs</Text>
        </View>
        {evento.visitorName && (
          <Text style={[styles.eventVisitor, { color: textColor }]}>{evento.visitorName}</Text>
        )}
        <View style={styles.eventMeta}>
          <Text style={[styles.eventDate, { color: mutedColor }]}>{dateLabel}</Text>
          {evento.tipo === 'timbrazo' && (
            <View style={[styles.notifBadge, { backgroundColor: evento.notificationSent ? 'rgba(52,199,89,0.15)' : 'rgba(255,149,0,0.15)' }]}>
              <Text style={[styles.notifBadgeText, { color: evento.notificationSent ? COLORS.success : COLORS.warning }]}>
                {evento.notificationSent ? '✓ Notif. enviada' : '⚠ Sin notif.'}
              </Text>
            </View>
          )}
        </View>
      </View>
      {evento.tipo === 'timbrazo' && (
        <TouchableOpacity onPress={() => onDelete(evento._id)} style={styles.deleteBtn}>
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={mutedColor} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const NotificationsScreen = ({ navigation }) => {
  const { usuario } = useAuth();
  const isDark = useColorScheme() === 'dark';
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('timbrazo');

  const bg = isDark ? '#000' : '#F0F0F5';

  const fetchEventos = useCallback(async (pageNum = 1, reset = false) => {
    if (!usuario?._id) return;
    try {
      const [evRes, stRes] = await Promise.all([
        eventosAPI.getHistorial(usuario._id, { page: pageNum, limit: 20, tipo: filter }),
        pageNum === 1 ? eventosAPI.getStats(usuario._id) : Promise.resolve(null),
      ]);

      const newEventos = evRes.data.eventos;
      if (reset || pageNum === 1) {
        setEventos(newEventos);
      } else {
        setEventos(prev => [...prev, ...newEventos]);
      }

      setHasMore(evRes.data.pagination.hasNext);
      if (stRes) setStats(stRes.data.stats);
    } catch (err) {
      console.error('Error fetching eventos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [usuario, filter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setPage(1);
      fetchEventos(1, true);
    }, [fetchEventos])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchEventos(1, true);
  };

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEventos(nextPage);
  };

  const handleDelete = (id) => {
    Alert.alert('Eliminar', '¿Eliminar este evento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await eventosAPI.delete(id);
            setEventos(prev => prev.filter(e => e._id !== id));
          } catch { Alert.alert('Error', 'No se pudo eliminar.'); }
        }
      }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#0A0A0A' : COLORS.primary }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historial</Text>
          <View style={{ width: 32 }} />
        </View>

        {stats && (
          <View style={styles.miniStats}>
            <View style={styles.miniStat}><Text style={styles.miniStatVal}>{stats.totalTimbre}</Text><Text style={styles.miniStatLbl}>Total</Text></View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStat}><Text style={styles.miniStatVal}>{stats.hoy}</Text><Text style={styles.miniStatLbl}>Hoy</Text></View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStat}><Text style={styles.miniStatVal}>{stats.semana}</Text><Text style={styles.miniStatLbl}>Semana</Text></View>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={[styles.filters, { backgroundColor: isDark ? '#111' : '#E8E8EE' }]}>
        {['timbrazo', 'vista_qr'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => { setFilter(f); setPage(1); setLoading(true); }}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f === 'timbrazo' ? 'Timbrazos' : 'Escaneos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : (
        <FlatList
          data={eventos}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <EventItem evento={item} onDelete={handleDelete} isDark={isDark} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ margin: SPACING.lg }} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="bell-off-outline" size={48} color={isDark ? COLORS.gray400 : COLORS.gray300} style={{ marginBottom: SPACING.md }} />
              <Text style={[styles.emptyText, { color: isDark ? COLORS.gray400 : COLORS.gray500 }]}>
                No hay {filter === 'timbrazo' ? 'timbrazos' : 'escaneos'} registrados
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: SPACING.base, paddingHorizontal: SPACING.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  backIcon: { color: COLORS.white, fontSize: 24, fontWeight: '600' },
  headerTitle: { color: COLORS.white, fontSize: FONT_SIZES.xl, fontWeight: '700' },
  miniStats: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xl, paddingVertical: SPACING.sm },
  miniStat: { alignItems: 'center' },
  miniStatVal: { color: COLORS.white, fontSize: FONT_SIZES.xl, fontWeight: '800' },
  miniStatLbl: { color: 'rgba(255,255,255,0.6)', fontSize: FONT_SIZES.xs, marginTop: 2 },
  miniStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  filters: { flexDirection: 'row', padding: SPACING.xs, margin: SPACING.base, borderRadius: RADIUS.xl },
  filterTab: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg, alignItems: 'center' },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterTabText: { color: COLORS.gray400, fontSize: FONT_SIZES.sm, fontWeight: '600' },
  filterTabTextActive: { color: COLORS.white },
  list: { padding: SPACING.base, gap: SPACING.sm, paddingBottom: SPACING['3xl'] },
  eventItem: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.xl, padding: SPACING.md,
    borderLeftWidth: 3, ...SHADOWS.sm,
  },
  eventIconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  eventEmoji: { fontSize: 22 },
  eventBody: { flex: 1 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventType: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  eventTime: { fontSize: FONT_SIZES.xs },
  eventVisitor: { fontSize: FONT_SIZES.sm, fontWeight: '600', marginTop: 2 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 4 },
  eventDate: { fontSize: FONT_SIZES.xs },
  notifBadge: { paddingHorizontal: SPACING.xs, paddingVertical: 2, borderRadius: RADIUS.full },
  notifBadgeText: { fontSize: 10, fontWeight: '600' },
  deleteBtn: { padding: SPACING.sm },
  deleteIcon: { fontSize: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: SPACING['4xl'] },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.base, textAlign: 'center' },
});

export default NotificationsScreen;
