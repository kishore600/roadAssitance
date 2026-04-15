import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ServiceItem } from '@/types';

export function ServiceCard({ item, onPress, disabled }: { item: ServiceItem; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity 
      style={[styles.card, disabled && styles.cardDisabled]} 
      onPress={onPress}
      disabled={disabled}
    >
      <View>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.subtitle}>Starting from ₹{item.base_price}</Text>
      </View>
      <Text style={styles.cta}>Book →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardDisabled: {
    opacity: 0.5,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },
  cta: { fontSize: 14, fontWeight: '700', color: '#2563EB' }
});