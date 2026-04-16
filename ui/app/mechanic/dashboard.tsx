import { useEffect, useState, useCallback } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import * as Location from "expo-location";
import { api } from "@/lib/api";
import { Booking } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import { socket } from "@/lib/socket";

export default function MechanicDashboard() {
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [myJobs, setMyJobs] = useState<Booking[]>([]);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"available" | "myJobs">(
    "available",
  );
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const { user, logout } = useAuth();

// Add this inside your useEffect in MechanicDashboard

useEffect(() => {
  if (user) {
    loadData();
    getCurrentLocation();
    startLocationTracking();
  }

  // Socket listener for new bookings
  socket.on("booking:new", (booking: any) => {
    console.log("New booking available:", booking);
    
    // Check if it's an auto-cancelled booking
    if (booking.auto_cancelled || booking.status === 'cancelled') {
      console.log("Booking was auto-cancelled:", booking);
      // Reload jobs to remove cancelled booking from list
      loadOpenJobs();
      return;
    }
    
    Alert.alert(
      "New Service Request!",
      `A customer needs ${booking.service?.name || "assistance"}. Tap to view details.`,
      [
        {
          text: "View",
          onPress: () => {
            setActiveTab("available");
            loadOpenJobs();
          },
        },
        { text: "Ignore", style: "cancel" },
      ],
    );
    loadOpenJobs();
  });

  return () => {
    socket.off("booking:new");
    if (locationInterval) clearInterval(locationInterval);
  };
}, [user]);

// Add this useEffect to periodically refresh jobs when online
useEffect(() => {
  if (online) {
    // Refresh available jobs every 10 seconds when online
    const refreshInterval = setInterval(() => {
      if (activeTab === "available") {
        loadOpenJobs();
      }
    }, 10000);
    
    return () => clearInterval(refreshInterval);
  }
}, [online, activeTab]);

  let locationInterval: any;

async function startLocationTracking() {
  // Update location every 5 seconds when online
  locationInterval = setInterval(async () => {
    if (online && myJobs.length > 0) {
      const activeJob = myJobs.find(job => 
        job.status === 'accepted' || job.status === 'on_the_way' || job.status === 'arrived'
      );
      
      if (activeJob) {
        await updateLocationAndEmit(activeJob.id, activeJob);
      }
    }
  }, 5000);
}
async function updateLocationAndEmit(bookingId: string, activeJob: any | undefined) {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const newLocation = {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    };

    setCurrentLocation(newLocation);

    // Update location in backend
    await api.patch(`/mechanics/${user?.id}/location`, newLocation);

    // Emit real-time location to customer
    socket.emit("mechanic:location", {
      bookingId: bookingId,
      location: newLocation,
      eta: calculateETA(
        newLocation,
        activeJob?.customer_lat,
        activeJob?.customer_lng,
      ),
    });
  } catch (error) {
    console.error("Failed to update location:", error);
  }
}

  function calculateETA(
    mechanicLoc: any,
    customerLat: number,
    customerLng: number,
  ): number {
    const distance = calculateDistance(
      mechanicLoc.lat,
      mechanicLoc.lng,
      customerLat,
      customerLng,
    );
    // Assume average speed of 30 km/h
    const etaMinutes = Math.ceil((distance / 30) * 60);
    return Math.min(etaMinutes, 30); // Cap at 30 minutes
  }

  async function updateLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      setCurrentLocation(newLocation);

      // Update location in backend
      await api.patch(`/mechanics/${user?.id}/location`, newLocation);
    } catch (error) {
      console.error("Failed to update location:", error);
    }
  }

  async function loadData() {
    await Promise.all([loadOpenJobs(), loadMyJobs(), loadAvailability()]);
    setLoading(false);
  }

  async function getCurrentLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCurrentLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error("Failed to get location:", error);
    }
  }

  async function loadOpenJobs() {
    try {
      const { data } = await api.get("/bookings/open");
      setJobs(data || []);
    } catch (error) {
      console.error("Failed to load jobs:", error);
    }
  }

  async function loadMyJobs() {
    try {
      const { data } = await api.get(`/bookings/mechanic/${user?.id}`);
      setMyJobs(data || []);
    } catch (error) {
      console.error("Failed to load my jobs:", error);
    }
  }

  async function loadAvailability() {
    try {
      const { data } = await api.get(`/mechanics/${user?.id}/availability`);
      setOnline(data?.is_online || false);
    } catch (error) {
      console.error("Failed to load availability:", error);
    }
  }

  async function toggleAvailability() {
    const nextState = !online;

    if (nextState) {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          Alert.alert(
            "Location Required",
            "Please enable location permissions to go online.",
            [{ text: "OK" }],
          );
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const lat = location.coords.latitude;
        const lng = location.coords.longitude;

        setCurrentLocation({ lat, lng });

        await api.patch(`/mechanics/${user?.id}/availability`, {
          isOnline: nextState,
          currentLat: lat,
          currentLng: lng,
        });

        setOnline(nextState);
        Alert.alert(
          "Status Updated",
          `You are now online and will receive booking requests.`,
        );
      } catch (error) {
        console.error("Failed to get location:", error);
        Alert.alert("Error", "Unable to get your current location.");
        return;
      }
    } else {
      try {
        await api.patch(`/mechanics/${user?.id}/availability`, {
          isOnline: nextState,
          currentLat: currentLocation?.lat || 0,
          currentLng: currentLocation?.lng || 0,
        });
        setOnline(nextState);
        Alert.alert("Status Updated", "You are now offline.");
      } catch (error) {
        Alert.alert("Error", "Failed to update availability");
      }
    }
  }

  async function acceptJob(booking: Booking) {
    setSelectedBooking(booking);
    setShowAcceptModal(true);
  }

  async function confirmAcceptJob() {
    if (!selectedBooking) return;

    setAccepting(true);
    try {
      const response = await api.patch(
        `/bookings/${selectedBooking.id}/assign`,
        {
          mechanicId: user?.id,
          etaMinutes: 15,
          status: "accepted",
        },
      );

      const updatedBooking = response.data;

      // Emit socket event for real-time acceptance
      socket.emit("booking:accept", {
        bookingId: selectedBooking.id,
        mechanic: {
          id: user?.id,
          full_name: user?.full_name,
          phone: user?.phone,
        },
        eta: 15,
      });

      // Join booking room for real-time updates
      socket.emit("join:booking", selectedBooking.id);

      Alert.alert(
        "✓ Accepted!",
        "You have accepted the job. Navigate to the customer's location now.",
      );

      setShowAcceptModal(false);
      await Promise.all([loadOpenJobs(), loadMyJobs()]);
    } catch (error) {
      console.error("Failed to accept job:", error);
      Alert.alert("Error", "Failed to accept job");
    } finally {
      setAccepting(false);
      setSelectedBooking(null);
    }
  }

  async function updateStatus(
    bookingId: string,
    status: "on_the_way" | "arrived" | "completed",
  ) {
    try {
      const response = await api.patch(`/bookings/${bookingId}/status`, {
        status,
      });
      const updatedBooking = response.data;

      // Emit socket event for status update
      socket.emit("booking:status:update", {
        bookingId: bookingId,
        status: status,
        timestamp: new Date().toISOString(),
      });

      // If completing the job, also emit completion event
      if (status === "completed") {
        socket.emit("booking:complete", {
          bookingId: bookingId,
          completedAt: new Date().toISOString(),
        });
      }

      Alert.alert("Updated", `Booking marked as ${status.replace("_", " ")}.`);
      await loadMyJobs();
      if (status === "completed") {
        loadOpenJobs();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      Alert.alert("Error", "Failed to update status");
    }
  }

  async function handleLogout() {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => logout() },
    ]);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await getCurrentLocation();
    await loadData();
    setRefreshing(false);
  }, []);

  const renderJobCard = (item: Booking, isMyJob: boolean = false) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => !isMyJob && item.status === "requested" && acceptJob(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.cardTitle}>
        Service Request #{item.id.slice(0, 8)}
      </Text>
      <Text style={styles.cardMeta}>
        Issue: {item.issue_note || "Road assistance needed"}
      </Text>
      <Text style={styles.cardMeta}>
        Status: {item.status?.replaceAll("_", " ") || "Pending"}
      </Text>
      {item.customer_address && (
        <Text style={styles.cardMeta}>Location: {item.customer_address}</Text>
      )}
      {item.customer_lat && item.customer_lng && currentLocation && (
        <Text style={styles.distanceText}>
          📍{" "}
          {calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            item.customer_lat,
            item.customer_lng,
          ).toFixed(1)}{" "}
          km away
        </Text>
      )}

      {!isMyJob && item.status === "requested" && (
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => acceptJob(item)}
        >
          <Text style={styles.acceptButtonText}>Accept Job</Text>
        </TouchableOpacity>
      )}

      {isMyJob &&
        item.status !== "completed" &&
        item.status !== "cancelled" && (
          <View style={styles.row}>
            {item.status === "accepted" && (
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() => updateStatus(item.id, "on_the_way")}
              >
                <Text style={styles.smallBtnText}>Start Journey</Text>
              </TouchableOpacity>
            )}
            {item.status === "on_the_way" && (
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() => updateStatus(item.id, "arrived")}
              >
                <Text style={styles.smallBtnText}>Arrived</Text>
              </TouchableOpacity>
            )}
            {item.status === "arrived" && (
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() => updateStatus(item.id, "completed")}
              >
                <Text style={styles.smallBtnText}>Complete Job</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
    </TouchableOpacity>
  );

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Modal visible={showAcceptModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Accept Job?</Text>
            <Text style={styles.modalText}>
              You are about to accept a service request from a customer.
            </Text>
            {selectedBooking && (
              <View style={styles.modalDetails}>
                <Text style={styles.modalDetailText}>
                  Service:{" "}
                  {selectedBooking.service?.name || "Roadside Assistance"}
                </Text>
                <Text style={styles.modalDetailText}>
                  Issue: {selectedBooking.issue_note || "Not specified"}
                </Text>
              </View>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowAcceptModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalAcceptButton]}
                onPress={confirmAcceptJob}
                disabled={accepting}
              >
                <Text style={styles.modalAcceptText}>
                  {accepting ? "Accepting..." : "Accept"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mechanic Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusBar}>
        <TouchableOpacity
          style={[
            styles.statusButton,
            online ? styles.onlineBtn : styles.offlineBtn,
          ]}
          onPress={toggleAvailability}
        >
          <Text style={styles.statusButtonText}>
            {online ? "● Online" : "○ Offline"}
          </Text>
        </TouchableOpacity>
        {online && currentLocation && (
          <Text style={styles.locationText}>📍 Location active</Text>
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "available" && styles.activeTab]}
          onPress={() => setActiveTab("available")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "available" && styles.activeTabText,
            ]}
          >
            Available Jobs ({jobs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "myJobs" && styles.activeTab]}
          onPress={() => setActiveTab("myJobs")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "myJobs" && styles.activeTabText,
            ]}
          >
            My Jobs ({myJobs.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === "available" ? jobs : myJobs}
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
        renderItem={({ item }) => renderJobCard(item, activeTab === "myJobs")}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {activeTab === "available"
                ? "No available jobs at the moment"
                : "You have no active jobs"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#64748B" },
  content: { padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  logoutButton: { padding: 8 },
  logoutText: { color: "#EF4444", fontSize: 14, fontWeight: "600" },
  statusBar: { padding: 16, alignItems: "center", gap: 8 },
  statusButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  onlineBtn: { backgroundColor: "#16A34A" },
  offlineBtn: { backgroundColor: "#64748B" },
  statusButtonText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  locationText: { fontSize: 12, color: "#64748B" },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#0F172A" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  activeTabText: { color: "#0F172A" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  cardMeta: { fontSize: 13, color: "#475569", marginTop: 4 },
  distanceText: {
    fontSize: 12,
    color: "#10B981",
    marginTop: 4,
    fontWeight: "500",
  },
  acceptButton: {
    backgroundColor: "#0F172A",
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  acceptButtonText: { color: "#FFF", fontWeight: "700", textAlign: "center" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  smallBtn: {
    flex: 1,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  smallBtnText: { color: "#0F172A", fontWeight: "700", fontSize: 12 },
  emptyState: { padding: 32, alignItems: "center" },
  emptyStateText: { color: "#64748B", fontSize: 14, textAlign: "center" },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  modalText: { fontSize: 14, color: "#475569", marginBottom: 16 },
  modalDetails: {
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalDetailText: { fontSize: 13, color: "#0F172A", marginBottom: 4 },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCancelButton: { backgroundColor: "#F1F5F9" },
  modalCancelText: { color: "#64748B", fontWeight: "600" },
  modalAcceptButton: { backgroundColor: "#0F172A" },
  modalAcceptText: { color: "#FFF", fontWeight: "600" },
});
