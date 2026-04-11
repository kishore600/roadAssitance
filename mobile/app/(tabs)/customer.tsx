import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { ServiceCard } from '@/components/ServiceCard';
import { api } from '@/lib/api';
import { Booking, Mechanic, ServiceItem } from '@/types';
import { socket } from '@/lib/socket';
import { BookingStatusCard } from '@/components/BookingStatusCard';

const DEMO_CUSTOMER_ID = '11111111-1111-1111-1111-111111111111';

export default function CustomerScreen() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [nearbyMechanics, setNearbyMechanics] = useState<Mechanic[]>([]);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [issueNote, setIssueNote] = useState('Flat tyre near my location');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    fetchServices();
    fetchLocationAndMechanics();

    socket.on('booking:updated', (booking: Booking) => {
      setCurrentBooking(booking);
    });

    return () => {
      socket.off('booking:updated');
    };
  }, []);

  const selectedMechanic = useMemo(() => nearbyMechanics[0], [nearbyMechanics]);

  async function fetchServices() {
    const { data } = await api.get('/services');
    setServices(data);
  }

  async function fetchLocationAndMechanics() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'Location is needed to find nearby mechanics.');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const nextCoords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
    setCoords(nextCoords);

    const { data } = await api.get('/mechanics/nearby', {
      params: {
        lat: nextCoords.latitude,
        lng: nextCoords.longitude,
        radiusKm: 10
      }
    });
    setNearbyMechanics(data);
  }

  async function createBooking(service: ServiceItem) {
    if (!coords) {
      Alert.alert('Location missing', 'Please enable your location first.');
      return;
    }

    const payload = {
      customerId: DEMO_CUSTOMER_ID,
      mechanicId: selectedMechanic?.id,
      serviceId: service.id,
      issueNote,
      customerLat: coords.latitude,
      customerLng: coords.longitude,
      customerAddress: 'Live GPS location'
    };

    const { data } = await api.post('/bookings', payload);
    setCurrentBooking(data);
    socket.emit('join:booking', data.id);
    Alert.alert('Booking created', 'A mechanic request has been sent.');
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Get Help Fast</Text>
            <Text style={styles.subtitle}>Book roadside support and track a mechanic live.</Text>

            <TextInput
              style={styles.input}
              value={issueNote}
              onChangeText={setIssueNote}
              placeholder="Describe your issue"
            />

            <Text style={styles.sectionTitle}>Nearby Mechanics</Text>
            <View style={styles.inlineCard}>
              <Text style={styles.inlineText}>
                {selectedMechanic
                  ? `${selectedMechanic.full_name} is currently the closest available mechanic.`
                  : 'No mechanic found nearby yet.'}
              </Text>
            </View>

            {currentBooking ? (
              <>
                <Text style={styles.sectionTitle}>Live Booking</Text>
                <BookingStatusCard booking={currentBooking} />
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Choose Service</Text>
          </View>
        }
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ServiceCard item={item} onPress={() => createBooking(item)} />}
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginTop: 10 },
  subtitle: { fontSize: 14, color: '#475569', marginTop: 8, marginBottom: 18 },
  input: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 10, marginTop: 8 },
  inlineCard: { backgroundColor: '#DBEAFE', padding: 14, borderRadius: 14, marginBottom: 16 },
  inlineText: { color: '#1E3A8A', fontWeight: '600' }
});
