import { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { BookingStatusCard } from '@/components/BookingStatusCard';
import { api } from '@/lib/api';
import { Booking } from '@/types';

const DEMO_CUSTOMER_ID = '11111111-1111-1111-1111-111111111111';

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    const { data } = await api.get(`/bookings/customer/${DEMO_CUSTOMER_ID}`);
    setBookings(data);
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Your Bookings</Text>
            <Text style={styles.subtitle}>Track active and past roadside requests.</Text>
          </View>
        }
        renderItem={({ item }) => <BookingStatusCard booking={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginTop: 10 },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 6, marginBottom: 18 }
});
