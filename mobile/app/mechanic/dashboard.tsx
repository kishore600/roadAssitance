import { useEffect, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '@/lib/api';
import { Booking } from '@/types';

const DEMO_MECHANIC_ID = '22222222-2222-2222-2222-222222222222';

export default function MechanicDashboard() {
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    loadOpenJobs();
  }, []);

  async function toggleAvailability() {
    const nextState = !online;
    await api.patch(`/mechanics/${DEMO_MECHANIC_ID}/availability`, {
      isOnline: nextState,
      currentLat: 13.0827,
      currentLng: 80.2707
    });
    setOnline(nextState);
  }

  async function loadOpenJobs() {
    const { data } = await api.get('/bookings/open');
    setJobs(data);
  }

  async function acceptJob(bookingId: string) {
    await api.patch(`/bookings/${bookingId}/assign`, {
      mechanicId: DEMO_MECHANIC_ID,
      etaMinutes: 18
    });
    Alert.alert('Accepted', 'You accepted the job.');
    loadOpenJobs();
  }

  async function updateStatus(bookingId: string, status: 'on_the_way' | 'arrived' | 'completed') {
    await api.patch(`/bookings/${bookingId}/status`, { status });
    Alert.alert('Updated', `Booking marked as ${status.replaceAll('_', ' ')}.`);
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Mechanic Dashboard</Text>
            <TouchableOpacity style={online ? styles.onlineBtn : styles.offlineBtn} onPress={toggleAvailability}>
              <Text style={styles.buttonText}>{online ? 'Go Offline' : 'Go Online'}</Text>
            </TouchableOpacity>
            <Text style={styles.subtitle}>Open jobs available nearby</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Booking #{item.id.slice(0, 8)}</Text>
            <Text style={styles.cardMeta}>Issue: {item.issue_note || 'Road assistance needed'}</Text>
            <Text style={styles.cardMeta}>Status: {item.status}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.smallBtn} onPress={() => acceptJob(item.id)}>
                <Text style={styles.smallBtnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={() => updateStatus(item.id, 'on_the_way')}>
                <Text style={styles.smallBtnText}>On the way</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={() => updateStatus(item.id, 'arrived')}>
                <Text style={styles.smallBtnText}>Arrived</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={() => updateStatus(item.id, 'completed')}>
                <Text style={styles.smallBtnText}>Complete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 14, marginBottom: 16 },
  onlineBtn: { backgroundColor: '#16A34A', padding: 14, borderRadius: 14 },
  offlineBtn: { backgroundColor: '#334155', padding: 14, borderRadius: 14 },
  buttonText: { color: '#FFF', textAlign: 'center', fontWeight: '700' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  cardMeta: { fontSize: 13, color: '#475569', marginTop: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  smallBtn: { backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  smallBtnText: { color: '#0F172A', fontWeight: '700', fontSize: 12 }
});
