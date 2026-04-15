import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import * as Location from "expo-location";
import { ServiceCard } from "@/components/ServiceCard";
import { api } from "@/lib/api";
import { Booking, Mechanic, ServiceItem } from "@/types";
import { socket } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";
import { router, useFocusEffect } from "expo-router";

// Distance calculation function
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CustomerScreen() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [nearbyMechanics, setNearbyMechanics] = useState<Mechanic[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const [issueNote, setIssueNote] = useState("");
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [waitingForMechanic, setWaitingForMechanic] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(
    null,
  );
  const { user, logout } = useAuth();

  const locationUpdateInterval = useRef<any>(null);

  // Check for active booking on focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        checkActiveBooking();
      }
    }, [user]),
  );

  // In CustomerScreen.tsx - Update the useEffect and add new socket listeners

  useEffect(() => {
    if (user && !activeBooking) {
      initializeApp();
    }

    // Listen for booking accepted event
    socket.on(
      "booking:accepted",
      (data: { booking: Booking; mechanic: Mechanic }) => {
        console.log("Booking accepted!", data);

        if (data.booking.id === activeBooking?.id) {
          setActiveBooking(data.booking);
          setWaitingForMechanic(false); // Close waiting modal

          // Show immediate alert
          Alert.alert(
            "✓ Request Accepted!",
            `${data.mechanic.full_name} has accepted your request and is on the way.`,
            [
              {
                text: "Track Now",
                onPress: () => console.log("Tracking started"),
              },
            ],
          );

          // Start tracking mechanic
          startTrackingMechanic(data.booking);
        }
      },
    );

    // Listen for status updates
    socket.on("booking:status:updated", (updatedBooking: Booking) => {
      console.log("Booking status updated:", updatedBooking);

      if (updatedBooking.id === activeBooking?.id) {
        setActiveBooking(updatedBooking);

        // Show status-specific alerts
        if (updatedBooking.status === "on_the_way") {
          Alert.alert(
            "🚗 Mechanic On The Way!",
            `ETA: ${updatedBooking.eta_minutes || "~15"} minutes`,
          );
        } else if (updatedBooking.status === "arrived") {
          Alert.alert(
            "📍 Mechanic Arrived",
            "Your mechanic has arrived at your location.",
          );
        } else if (updatedBooking.status === "completed") {
          Alert.alert(
            "✅ Service Completed",
            "Thank you for using our service! Please rate your experience.",
          );
          setTimeout(() => {
            setActiveBooking(null);
            loadBookings();
          }, 3000);
        } else if (updatedBooking.status === "cancelled") {
          Alert.alert(
            "❌ Request Cancelled",
            "Your request has been cancelled.",
          );
          setActiveBooking(null);
          setWaitingForMechanic(false);
          loadBookings();
        }
      }
    });

    // Listen for mechanic location updates (realtime tracking)
    socket.on(
      "mechanic:location:update",
      (data: {
        bookingId: string;
        location: { lat: number; lng: number };
        eta: number;
      }) => {
        if (data.bookingId === activeBooking?.id) {
          setActiveBooking((prev: any) =>
            prev
              ? {
                  ...prev,
                  mechanic_location: data.location,
                  eta_minutes: data.eta,
                }
              : null,
          );
        }
      },
    );

    // Original booking:updated listener (keep for backup)
    socket.on("booking:updated", (updatedBooking: Booking) => {
      console.log("Booking updated:", updatedBooking);

      if (updatedBooking.id === activeBooking?.id) {
        setActiveBooking(updatedBooking);

        if (
          updatedBooking.status === "accepted" &&
          updatedBooking.mechanic_id
        ) {
          setWaitingForMechanic(false);
          startTrackingMechanic(updatedBooking);
        }

        if (
          updatedBooking.status === "completed" ||
          updatedBooking.status === "cancelled"
        ) {
          setTimeout(() => {
            setActiveBooking(null);
            setWaitingForMechanic(false);
            loadBookings();
          }, 3000);
        }
      }
    });

    return () => {
      socket.off("booking:accepted");
      socket.off("booking:status:updated");
      socket.off("mechanic:location:update");
      socket.off("booking:updated");
      if (locationUpdateInterval.current) {
        clearInterval(locationUpdateInterval.current);
      }
    };
  }, [user, activeBooking]);

  async function checkActiveBooking() {
    try {
      const { data } = await api.get(`/bookings/customer/${user?.id}`);
      const active = data.find(
        (b: Booking) => b.status !== "completed" && b.status !== "cancelled",
      );

      if (active) {
        setActiveBooking(active);
        if (
          active.status === "accepted" ||
          active.status === "on_the_way" ||
          active.status === "arrived"
        ) {
          startTrackingMechanic(active);
        } else if (active.status === "requested") {
          setWaitingForMechanic(true);
        }
      }
    } catch (error) {
      console.error("Failed to check active booking:", error);
    }
  }

  async function initializeApp() {
    await fetchServices();
    await fetchLocationAndMechanics();
    await loadBookings();
    setLoading(false);
  }

  async function fetchServices() {
    try {
      const { data } = await api.get("/services");
      setServices(data || []);
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  }

  async function fetchLocationAndMechanics() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        "Permission required",
        "Location is needed to find nearby mechanics.",
      );
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const nextCoords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    setCoords(nextCoords);

    try {
      const { data } = await api.get("/mechanics/nearby", {
        params: {
          lat: nextCoords.latitude,
          lng: nextCoords.longitude,
          radiusKm: 10,
        },
      });
      setNearbyMechanics(data || []);
    } catch (error) {
      console.error("Failed to fetch mechanics:", error);
    }
  }

  async function loadBookings() {
    if (!user) return;

    try {
      const { data } = await api.get(`/bookings/customer/${user.id}`);
      setBookings(data);
    } catch (error) {
      console.error("Failed to load bookings:", error);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchServices();
    await fetchLocationAndMechanics();
    await loadBookings();
    setRefreshing(false);
  }, []);

  async function createBooking(service: ServiceItem) {
    if (!coords) {
      Alert.alert("Location missing", "Please enable your location first.");
      return;
    }

    if (!user) {
      Alert.alert("Not logged in", "Please login to create a booking");
      router.push("/(auth)/login");
      return;
    }

    setCreatingBooking(true);
    setSelectedService(service);

    try {
      const payload = {
        customerId: user.id,
        mechanicId: null, // No mechanic selected
        serviceId: service.id,
        issueNote: issueNote || `${service.name} assistance needed`,
        customerLat: coords.latitude,
        customerLng: coords.longitude,
        customerAddress: "Live GPS location",
        status: "requested",
      };

      const { data } = await api.post("/bookings", payload);
      setActiveBooking(data);
      setWaitingForMechanic(true);
      socket.emit("join:booking", data.id);

      Alert.alert(
        "Request Sent",
        "Looking for nearby mechanics... You'll be notified when one accepts your request.",
      );
      setIssueNote("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create booking");
      setWaitingForMechanic(false);
      setSelectedService(null);
    } finally {
      setCreatingBooking(false);
    }
  }

  function startTrackingMechanic(booking: Booking) {
    // Join mechanic's room for location updates
    if (booking.mechanic_id) {
      socket.emit("join:mechanic", booking.mechanic_id);

      // Listen for mechanic location updates
      socket.on(
        `mechanic:location:${booking.mechanic_id}`,
        (location: { lat: number; lng: number }) => {
          setActiveBooking((prev: any) =>
            prev
              ? {
                  ...prev,
                  mechanic_location: location,
                }
              : null,
          );
        },
      );
    }
  }

  async function cancelActiveBooking() {
    Alert.alert(
      "Cancel Request",
      "Are you sure you want to cancel this request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              await api.patch(`/bookings/${activeBooking?.id}/cancel`, {});
              setActiveBooking(null);
              setWaitingForMechanic(false);
              Alert.alert("Cancelled", "Your request has been cancelled.");
              loadBookings();
            } catch (error) {
              Alert.alert("Error", "Failed to cancel request");
            }
          },
        },
      ],
    );
  }

  async function handleLogout() {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => logout() },
    ]);
  }

  // Render waiting screen
  const renderWaitingScreen = () => (
    <Modal
      visible={waitingForMechanic}
      transparent={false}
      animationType="slide"
    >
      <SafeAreaView style={styles.waitingContainer}>
        <View style={styles.waitingContent}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.waitingTitle}>Finding a mechanic...</Text>
          <Text style={styles.waitingText}>
            Looking for available mechanics near you
          </Text>

          {selectedService && (
            <View style={styles.serviceInfoBox}>
              <Text style={styles.serviceInfoText}>
                Service: {selectedService.name}
              </Text>
              {issueNote && (
                <Text style={styles.serviceInfoText}>Note: {issueNote}</Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={cancelActiveBooking}
          >
            <Text style={styles.cancelButtonText}>Cancel Request</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

const renderTrackingScreen = () => {
  if (!activeBooking || activeBooking.status === 'requested') return null;
  
  const distance = activeBooking.mechanic_location && coords
    ? calculateDistance(
        coords.latitude,
        coords.longitude,
        activeBooking.mechanic_location.lat,
        activeBooking.mechanic_location.lng
      )
    : null;
  
  // Animated progress based on status
  const getProgressPercentage = () => {
    switch(activeBooking.status) {
      case 'accepted': return 25;
      case 'on_the_way': return 50;
      case 'arrived': return 75;
      case 'completed': return 100;
      default: return 0;
    }
  };
  
  return (
    <Modal visible={!!activeBooking} transparent={false} animationType="slide">
      <SafeAreaView style={styles.trackingContainer}>
        <View style={styles.trackingHeader}>
          <Text style={styles.trackingTitle}>
            {activeBooking.status === 'accepted' && '✓ Mechanic Assigned!'}
            {activeBooking.status === 'on_the_way' && '🚗 Mechanic is Coming!'}
            {activeBooking.status === 'arrived' && '📍 Mechanic Has Arrived!'}
            {activeBooking.status === 'completed' && '✅ Service Completed!'}
            {activeBooking.status === 'cancelled' && '❌ Request Cancelled'}
          </Text>
          
          {(activeBooking.status === 'completed' || activeBooking.status === 'cancelled') && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setActiveBooking(null);
                loadBookings();
              }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {activeBooking.status !== 'completed' && activeBooking.status !== 'cancelled' && (
          <>
            <View style={styles.mechanicInfoCard}>
              <View style={styles.mechanicAvatar}>
                <Text style={styles.avatarText}>
                  {activeBooking.mechanic?.full_name?.charAt(0) || 'M'}
                </Text>
              </View>
              <Text style={styles.mechanicName}>
                {activeBooking.mechanic?.full_name || 'Mechanic Assigned'}
              </Text>
              <Text style={styles.mechanicStatus}>
                Status: {activeBooking.status?.replace('_', ' ').toUpperCase()}
              </Text>
              {distance !== null && (
                <View style={styles.distanceContainer}>
                  <Text style={styles.distanceText}>
                    📍 {distance < 1 
                      ? `${Math.round(distance * 1000)} meters away`
                      : `${distance.toFixed(1)} km away`}
                  </Text>
                  {activeBooking.eta_minutes && (
                    <Text style={styles.etaText}>
                      ⏱️ ETA: ~{activeBooking.eta_minutes} minutes
                    </Text>
                  )}
                </View>
              )}
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${getProgressPercentage()}%` }]} />
              </View>
              <View style={styles.progressSteps}>
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepCircle,
                    (activeBooking.status === 'accepted' || 
                     activeBooking.status === 'on_the_way' || 
                     activeBooking.status === 'arrived') && styles.stepActive
                  ]}>
                    <Text style={styles.stepNumber}>1</Text>
                  </View>
                  <Text style={styles.stepLabel}>Assigned</Text>
                </View>
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepCircle,
                    (activeBooking.status === 'on_the_way' || 
                     activeBooking.status === 'arrived') && styles.stepActive
                  ]}>
                    <Text style={styles.stepNumber}>2</Text>
                  </View>
                  <Text style={styles.stepLabel}>On The Way</Text>
                </View>
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepCircle,
                    activeBooking.status === 'arrived' && styles.stepActive
                  ]}>
                    <Text style={styles.stepNumber}>3</Text>
                  </View>
                  <Text style={styles.stepLabel}>Arrived</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.cancelTrackingButton}
              onPress={cancelActiveBooking}
            >
              <Text style={styles.cancelTrackingButtonText}>Cancel Service</Text>
            </TouchableOpacity>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
};

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderWaitingScreen()}
      {renderTrackingScreen()}

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0F172A"]}
            tintColor="#0F172A"
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Get Help Fast</Text>
                <Text style={styles.subtitle}>Request roadside support</Text>
                {user && (
                  <Text style={styles.userInfo}>Welcome, {user.full_name}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={handleLogout}
                style={styles.logoutButton}
              >
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              value={issueNote}
              onChangeText={setIssueNote}
              placeholder="Describe your issue (optional)"
              multiline
            />

            <Text style={styles.sectionTitle}>Choose Service</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ServiceCard
            item={item}
            onPress={() => createBooking(item)}
            disabled={creatingBooking || !!activeBooking}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9", marginTop: 20 },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#64748B" },
  content: { padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 10,
  },
  title: { fontSize: 28, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 14, color: "#475569", marginTop: 8, marginBottom: 4 },
  userInfo: { fontSize: 12, color: "#64748B", marginTop: 4 },
  logoutButton: { padding: 8 },
  logoutText: { color: "#EF4444", fontSize: 14, fontWeight: "600" },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    minHeight: 80,
    textAlignVertical: "top",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
    marginTop: 8,
  },

  // Waiting screen styles
  waitingContainer: { flex: 1, backgroundColor: "#F1F5F9" },
  waitingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 24,
  },
  waitingText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 12,
  },
  serviceInfoBox: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    width: "100%",
  },
  serviceInfoText: { fontSize: 14, color: "#0F172A", marginTop: 4 },
  cancelButton: {
    marginTop: 32,
    backgroundColor: "#EF4444",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },

  // Tracking screen styles
  trackingContainer: { flex: 1, backgroundColor: "#F1F5F9" },
  trackingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  trackingTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  closeButton: { padding: 8 },
  closeButtonText: { color: "#0F172A", fontSize: 14, fontWeight: "600" },
  mechanicInfoCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    margin: 16,
    alignItems: "center",
  },
  mechanicName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  mechanicStatus: { fontSize: 14, color: "#64748B", marginBottom: 8 },
  distanceText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 8,
  },
  etaText: { fontSize: 14, color: "#10B981", marginTop: 4 },
  progressContainer: { padding: 16, marginTop: 20 },
  progressSteps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  step: { alignItems: "center", flex: 1 },
  stepCompleted: { opacity: 1 },

  stepText: { fontSize: 12, color: "#64748B", textAlign: "center" },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 8,
  },
  cancelTrackingButton: {
    margin: 16,
    backgroundColor: "#EF4444",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelTrackingButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  mechanicAvatar: {
  width: 80,
  height: 80,
  borderRadius: 40,
  backgroundColor: '#0F172A',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 12,
},
avatarText: {
  fontSize: 32,
  fontWeight: '700',
  color: '#FFF',
},
distanceContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
  marginTop: 12,
  paddingHorizontal: 20,
},
progressBarBg: {
  height: 8,
  backgroundColor: '#E2E8F0',
  borderRadius: 4,
  overflow: 'hidden',
  marginBottom: 24,
},
progressBarFill: {
  height: '100%',
  backgroundColor: '#10B981',
  borderRadius: 4,
},
stepItem: {
  alignItems: 'center',
  flex: 1,
},
stepCircle: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#E2E8F0',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 8,
},
stepActive: {
  backgroundColor: '#10B981',
},
stepNumber: {
  fontSize: 16,
  fontWeight: '700',
  color: '#FFF',
},
stepLabel: {
  fontSize: 12,
  color: '#64748B',
},
});
