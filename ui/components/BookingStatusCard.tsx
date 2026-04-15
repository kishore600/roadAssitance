import { StyleSheet, Text, View } from 'react-native';
import { Booking } from '@/types';

export function BookingStatusCard({ booking }: { booking: Booking }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Booking #{booking.id.slice(0, 8)}</Text>
      <Text style={styles.status}>Status: {booking.status.replaceAll('_', ' ')}</Text>
      {booking.eta_minutes ? <Text style={styles.meta}>ETA: {booking.eta_minutes} mins</Text> : null}
      {booking.amount ? <Text style={styles.meta}>Amount: ₹{booking.amount}</Text> : null}
      {booking.issue_note ? <Text style={styles.note}>{booking.issue_note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  status: { fontSize: 14, fontWeight: '600', color: '#2563EB', marginTop: 8 },
  meta: { fontSize: 13, color: '#475569', marginTop: 4 },
  note: { fontSize: 13, color: '#334155', marginTop: 8 }
});
