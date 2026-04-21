import React, { useEffect, useState, useRef } from 'react';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { Mechanic } from '@/types';

interface MechanicMapProps {
  onMechanicSelect?: (mechanic: Mechanic) => void;
  showNearbyMechanics?: boolean;
  bookingId?: string;
  mechanicLocation?: { latitude: number; longitude: number } | null;
  customerLocation?: { latitude: number; longitude: number } | null;
  isTracking?: boolean;
}

export const MechanicMap: React.FC<MechanicMapProps> = ({
  onMechanicSelect,
  showNearbyMechanics = true,
  bookingId,
  mechanicLocation,
  customerLocation,
  isTracking = false,
}) => {
  const [userLocation, setUserLocation] = useState<Region | null>(null);
  const [nearbyMechanics, setNearbyMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (showNearbyMechanics && userLocation) {
      fetchNearbyMechanics();
      const interval = setInterval(fetchNearbyMechanics, 30000);
      return () => clearInterval(interval);
    }
  }, [userLocation, showNearbyMechanics]);

  useEffect(() => {
    if (isTracking && mechanicLocation && customerLocation) {
      calculateRoute();
      animateToFitBothLocations();
    }
  }, [mechanicLocation, customerLocation, isTracking]);

  const getUserLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Please enable location to see nearby mechanics');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setUserLocation(region);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion(region, 1000);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyMechanics = async () => {
    if (!userLocation) return;

    try {
      const { data } = await api.get('/mechanics/nearby', {
        params: {
          lat: userLocation.latitude,
          lng: userLocation.longitude,
          radiusKm: 10,
        },
      });
      setNearbyMechanics(data || []);
    } catch (error) {
      console.error('Error fetching mechanics:', error);
    }
  };

  const calculateRoute = async () => {
    if (!mechanicLocation || !customerLocation) return;

    try {
      // Using OpenStreetMap's Routing API (free alternative to Google Maps)
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${mechanicLocation.longitude},${mechanicLocation.latitude};${customerLocation.longitude},${customerLocation.latitude}?overview=full&geometries=geojson`
      );
      
      const data = await response.json();
      if (data.code === 'Ok' && data.routes.length > 0) {
        const coordinates = data.routes[0].geometry.coordinates.map((coord: number[]) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        setRouteCoordinates(coordinates);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  const animateToFitBothLocations = () => {
    if (mapRef.current && mechanicLocation && customerLocation) {
      const minLat = Math.min(mechanicLocation.latitude, customerLocation.latitude);
      const maxLat = Math.max(mechanicLocation.latitude, customerLocation.latitude);
      const minLng = Math.min(mechanicLocation.longitude, customerLocation.longitude);
      const maxLng = Math.max(mechanicLocation.longitude, customerLocation.longitude);
      
      const region = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.abs(maxLat - minLat) * 1.5,
        longitudeDelta: Math.abs(maxLng - minLng) * 1.5,
      };
      
      mapRef.current.animateToRegion(region, 1000);
    }
  };

  const centerOnCurrentLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(userLocation, 1000);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsTraffic={false}
        zoomEnabled={true}
        zoomControlEnabled={true}
      >
        {/* User Location Marker */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="Your Location"
          >
            <View style={styles.userMarker}>
              <Ionicons name="person" size={20} color="#FFF" />
            </View>
          </Marker>
        )}

        {/* Customer Location (for tracking mode) */}
        {customerLocation && isTracking && (
          <Marker
            coordinate={{
              latitude: customerLocation.latitude,
              longitude: customerLocation.longitude,
            }}
            title="Customer Location"
          >
            <View style={styles.customerMarker}>
              <Ionicons name="home" size={20} color="#FFF" />
            </View>
          </Marker>
        )}

        {/* Mechanic Location (for tracking mode) */}
        {mechanicLocation && isTracking && (
          <Marker
            coordinate={{
              latitude: mechanicLocation.latitude,
              longitude: mechanicLocation.longitude,
            }}
            title="Mechanic Location"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.mechanicMarker}>
              <Ionicons name="construct" size={20} color="#FFF" />
            </View>
          </Marker>
        )}

        {/* Nearby Mechanics Markers */}
        {showNearbyMechanics && !isTracking && nearbyMechanics.map((mechanic:any) => (
          <Marker
            key={mechanic.id}
            coordinate={{
              latitude: mechanic.current_lat,
              longitude: mechanic.current_lng,
            }}
            title={mechanic.full_name}
            description={`${mechanic.distance_km?.toFixed(1)} km away`}
            onPress={() => {
              setSelectedMechanic(mechanic);
              if (onMechanicSelect) {
                onMechanicSelect(mechanic);
              }
            }}
          >
            <View style={[
              styles.mechanicMarker,
              selectedMechanic?.id === mechanic.id && styles.selectedMarker
            ]}>
              <Ionicons name="construct" size={16} color="#FFF" />
            </View>
          </Marker>
        ))}

        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#10B981"
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      {/* Controls */}
      <TouchableOpacity
        style={styles.locationButton}
        onPress={centerOnCurrentLocation}
      >
        <Ionicons name="locate" size={24} color="#0F172A" />
      </TouchableOpacity>

      {isTracking && (
        <View style={styles.trackingInfo}>
          <View style={styles.trackingCard}>
            <Ionicons name="car" size={20} color="#10B981" />
            <Text style={styles.trackingText}>
              {routeCoordinates.length > 0 ? 'Mechanic en route' : 'Waiting for location update'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  userMarker: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  mechanicMarker: {
    backgroundColor: '#0F172A',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  customerMarker: {
    backgroundColor: '#F59E0B',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  selectedMarker: {
    backgroundColor: '#10B981',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  locationButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#FFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trackingInfo: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
  },
  trackingCard: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
});