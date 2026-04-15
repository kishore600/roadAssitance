import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { api } from '@/lib/api';
import { Mechanic } from '@/types';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface MechanicMapProps {
  onMechanicSelect?: (mechanic: Mechanic) => void;
  radiusKm?: number;
}

export function MechanicMap({ onMechanicSelect, radiusKm = 10 }: MechanicMapProps) {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const [currentRadius, setCurrentRadius] = useState(radiusKm);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    loadNearbyMechanics();
  }, [currentRadius]);

  async function loadNearbyMechanics() {
    try {
      // Request location permission
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to find nearby mechanics.'
        );
        setLoading(false);
        return;
      }

      // Get current location with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const userLoc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(userLoc);

      // Fetch nearby mechanics with customer location and radius
      const { data } = await api.get('/mechanics/nearby', {
        params: {
          lat: userLoc.latitude,
          lng: userLoc.longitude,
          radiusKm: currentRadius,
        },
      });
      
      console.log('Nearby mechanics within', currentRadius, 'km:', data);
      
      // Filter mechanics with valid coordinates and online status
      const mechanicsWithLocation = data.filter(
        (m: Mechanic) => m.current_lat && m.current_lng && m.is_online === true
      );
      
      setMechanics(mechanicsWithLocation);

      // Animate map to show all markers
      if (mapRef.current && mechanicsWithLocation.length > 0) {
        const coordinates = [
          userLoc,
          ...mechanicsWithLocation.map((m: Mechanic) => ({
            latitude: m.current_lat!,
            longitude: m.current_lng!,
          })),
        ];
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      } else if (mapRef.current && userLoc) {
        mapRef.current.animateToRegion({
          ...userLoc,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    } catch (error) {
      console.error('Failed to load mechanics:', error);
      Alert.alert('Error', 'Failed to load nearby mechanics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNearbyMechanics();
  }, [currentRadius]);

  const handleMechanicPress = (mechanic: Mechanic) => {
    setSelectedMechanic(mechanic);
    if (onMechanicSelect) {
      onMechanicSelect(mechanic);
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  };

  const changeRadius = (radius: number) => {
    setCurrentRadius(radius);
    setLoading(true);
  };

  // Calculate distance between user and mechanic
  const getDistance = (mechanicLat: number, mechanicLng: number) => {
    if (!userLocation) return null;
    
    const R = 6371; // Earth's radius in km
    const dLat = (mechanicLat - userLocation.latitude) * Math.PI / 180;
    const dLon = (mechanicLng - userLocation.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.latitude * Math.PI / 180) * 
      Math.cos(mechanicLat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Finding mechanics within {currentRadius}km...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {userLocation && (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
    
        >
          {/* User Location Marker */}
          <Marker coordinate={userLocation} pinColor="#3B82F6">
            <Callout>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>You are here</Text>
              </View>
            </Callout>
          </Marker>

          {/* Mechanics Markers */}
          {mechanics.map((mechanic) => {
            const distance = mechanic.current_lat && mechanic.current_lng 
              ? getDistance(mechanic.current_lat, mechanic.current_lng) 
              : null;
              
            return (
              <Marker
                key={mechanic.id}
                coordinate={{
                  latitude: mechanic.current_lat!,
                  longitude: mechanic.current_lng!,
                }}
                pinColor={mechanic.is_online ? "#10B981" : "#EF4444"}
                onPress={() => handleMechanicPress(mechanic)}
              >
                <Callout>
                  <View style={styles.calloutContainer}>
                    <Text style={styles.calloutTitle}>{mechanic.full_name}</Text>
                    <Text style={styles.calloutStatus}>
                      Status: {mechanic.is_online ? '🟢 Online' : '🔴 Offline'}
                    </Text>
                    {mechanic.vehicle_type && (
                      <Text style={styles.calloutInfo}>
                        Vehicle: {mechanic.vehicle_type}
                      </Text>
                    )}
                    {distance && (
                      <Text style={styles.calloutInfo}>
                        Distance: {distance}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={styles.calloutButton}
                      onPress={() => {
                        if (onMechanicSelect) {
                          onMechanicSelect(mechanic);
                        }
                      }}
                    >
                      <Text style={styles.calloutButtonText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>
      )}

      {/* Radius Selector */}
      <View style={styles.radiusContainer}>
        <Text style={styles.radiusLabel}>Radius:</Text>
        <TouchableOpacity
          style={[styles.radiusButton, currentRadius === 5 && styles.radiusButtonActive]}
          onPress={() => changeRadius(5)}
        >
          <Text style={[styles.radiusButtonText, currentRadius === 5 && styles.radiusButtonTextActive]}>
            5km
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radiusButton, currentRadius === 10 && styles.radiusButtonActive]}
          onPress={() => changeRadius(10)}
        >
          <Text style={[styles.radiusButtonText, currentRadius === 10 && styles.radiusButtonTextActive]}>
            10km
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radiusButton, currentRadius === 20 && styles.radiusButtonActive]}
          onPress={() => changeRadius(20)}
        >
          <Text style={[styles.radiusButtonText, currentRadius === 20 && styles.radiusButtonTextActive]}>
            20km
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radiusButton, currentRadius === 50 && styles.radiusButtonActive]}
          onPress={() => changeRadius(50)}
        >
          <Text style={[styles.radiusButtonText, currentRadius === 50 && styles.radiusButtonTextActive]}>
            50km
          </Text>
        </TouchableOpacity>
      </View>

      {/* Center on User Button */}
      <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
        <Text style={styles.centerButtonText}>📍</Text>
      </TouchableOpacity>

      {/* Mechanics Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {mechanics.length} Mechanic{mechanics.length !== 1 ? 's' : ''} Nearby
        </Text>
      </View>

      {/* Selected Mechanic Info */}
      {selectedMechanic && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedCardContent}>
            <View>
              <Text style={styles.selectedName}>{selectedMechanic.full_name}</Text>
              <Text style={styles.selectedStatus}>
                {selectedMechanic.is_online ? '🟢 Available' : '🔴 Offline'}
              </Text>
              {selectedMechanic.vehicle_type && (
                <Text style={styles.selectedInfo}>
                  Vehicle: {selectedMechanic.vehicle_type}
                </Text>
              )}
              {selectedMechanic.current_lat && selectedMechanic.current_lng && (
                <Text style={styles.selectedInfo}>
                  Distance: {getDistance(selectedMechanic.current_lat, selectedMechanic.current_lng)}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                router.push({
                  pathname: '/(tabs)/customer',
                  params: { mechanicId: selectedMechanic.id },
                });
              }}
            >
              <Text style={styles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedMechanic(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: width,
    height: height,
  },
  centerContainer: {
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
  radiusContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1,
  },
  radiusLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
    textAlign: 'center',
  },
  radiusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: 2,
    backgroundColor: '#F1F5F9',
  },
  radiusButtonActive: {
    backgroundColor: '#0F172A',
  },
  radiusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  radiusButtonTextActive: {
    color: '#FFF',
  },
  centerButton: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1,
  },
  centerButtonText: {
    fontSize: 24,
  },
  countContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 1,
  },
  countText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  calloutContainer: {
    padding: 8,
    minWidth: 150,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  calloutStatus: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  calloutInfo: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  calloutButton: {
    backgroundColor: '#0F172A',
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  calloutButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1,
  },
  selectedCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  selectedStatus: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  selectedInfo: {
    fontSize: 12,
    color: '#94A3B8',
  },
  selectButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748B',
  },
});