// app/customer/index.tsx - Fixed version with proper tracking

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
  ScrollView,
  Dimensions,
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { ServiceCard } from "@/components/ServiceCard";
import { api } from "@/lib/api";
import { Booking, Mechanic, ServiceItem, SavedLocation } from "@/types";
import { socket } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LocationPicker } from "@/components/LocationPicker";

const { width, height } = Dimensions.get("window");
const GOOGLE_MAPS_API_KEY = process.env
  .EXPO_PUBLIC_GOOGLE_MAPS_API_KEY as string;

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
  const [timeRemaining, setTimeRemaining] = useState<number>(120);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  // OTP and Rating States
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [customerRating, setCustomerRating] = useState(0);
  const [customerReview, setCustomerReview] = useState("");
  const [completingService, setCompletingService] = useState(false);
  const [completedBookingId, setCompletedBookingId] = useState<string | null>(
    null,
  );

  // Location picker states
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    isCurrentLocation?: boolean;
    savedLocationId?: string;
  } | null>(null);

  // Map and Tracking States
  const [mechanicLocation, setMechanicLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
  } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrackingModal, setCurrentTrackingModal] = useState<
    "waiting" | "tracking" | null
  >(null);
  const mapRef = useRef<MapView>(null);
  const locationUpdateInterval = useRef<any>(null);

  // Check for active booking on focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        checkActiveBooking();
      }
    }, [user]),
  );

  const sendLocationUpdate = async (bookingId: string, eta: number) => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData = {
        bookingId: bookingId,
        location: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        },
        eta: eta,
        mechanicId: user?.id,
        timestamp: new Date().toISOString(),
      };

      console.log("Sending location update:", locationData);
      socket.emit("mechanic:location:update", locationData);
      // Also emit to alternative event name for redundancy
      socket.emit("mechanic:location", locationData);
    } catch (error) {
      console.error("Failed to get location:", error);
    }
  };

  // Start periodic location updates
  useEffect(() => {
    if (activeBooking && activeBooking.status === "accepted") {
      const interval = setInterval(() => {
        sendLocationUpdate(activeBooking.id, 10);
      }, 3000); // Update every 3 seconds

      return () => clearInterval(interval);
    }
  }, [activeBooking]);

  useEffect(() => {
    // Listen for mechanic location updates
    const handleMechanicLocationUpdate = (data: {
      bookingId: string;
      location: { lat: number; lng: number };
      eta: number;
      timestamp?: string;
    }) => {
      console.log("🔴 Mechanic location update received:", data);

      if (data.bookingId === activeBooking?.id) {
        console.log("✅ Location update matches active booking");

        // Validate location data
        if (
          !data.location ||
          typeof data.location.lat !== "number" ||
          typeof data.location.lng !== "number"
        ) {
          console.error("❌ Invalid location data received:", data.location);
          return;
        }

        const newLocation = {
          latitude: data.location.lat,
          longitude: data.location.lng,
        };

        console.log("📍 Updating mechanic location to:", newLocation);
        setMechanicLocation(newLocation);

        setActiveBooking((prev: any) =>
          prev
            ? {
                ...prev,
                mechanic_location: data.location,
                eta_minutes: data.eta,
              }
            : null,
        );

        // Ensure tracking map is shown
        if (currentTrackingModal !== "tracking") {
          console.log("🔄 Showing tracking modal");
          setCurrentTrackingModal("tracking");
        }
        setIsTracking(true);

        // Auto-fit map bounds when location updates
        if (mapRef.current && coords && newLocation) {
          console.log("🗺️ Auto-fitting map to show both locations");
          mapRef.current.fitToCoordinates([coords, newLocation], {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
      } else {
        console.log(
          `⚠️ Location update for booking ${data.bookingId} but active booking is ${activeBooking?.id}`,
        );
      }
    };

    socket.on("mechanic:location:update", handleMechanicLocationUpdate);

    // Also listen for alternative event name
    socket.on("mechanic:location:updated", handleMechanicLocationUpdate);

    return () => {
      socket.off("mechanic:location:update", handleMechanicLocationUpdate);
      socket.off("mechanic:location:updated", handleMechanicLocationUpdate);
    };
  }, [activeBooking?.id, coords, currentTrackingModal]);
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
          setWaitingForMechanic(false);
          setIsTracking(true);
          setCurrentTrackingModal("tracking");

          Alert.alert(
            "✓ Request Accepted!",
            `${data.mechanic.full_name} has accepted your request. Tracking their location now.`,
            [{ text: "OK" }],
          );

          startTrackingMechanic(data.booking);
        }
      },
    );

    // Listen for status updates
    socket.on("booking:status:updated", (updatedBooking: Booking) => {
      console.log("Booking status updated:", updatedBooking);

      if (updatedBooking.id === activeBooking?.id) {
        setActiveBooking(updatedBooking);

        if (updatedBooking.status === "on_the_way") {
          Alert.alert(
            "🚗 Mechanic On The Way!",
            `ETA: ${updatedBooking.eta_minutes || "~15"} minutes`,
          );
          setCurrentTrackingModal("tracking");
          setIsTracking(true);
        } else if (updatedBooking.status === "arrived") {
          Alert.alert(
            "📍 Mechanic Arrived",
            "Your mechanic has arrived. Please ask them for the OTP code to complete the service.",
          );
          setShowOTPModal(true);
          setCurrentTrackingModal("tracking");
        } else if (updatedBooking.status === "completed") {
          Alert.alert(
            "✅ Service Completed",
            "Thank you for using our service! Please rate your experience.",
          );
          setCompletedBookingId(updatedBooking.id);
          setShowRatingModal(true);
          setIsTracking(false);
          setCurrentTrackingModal(null);
        } else if (updatedBooking.status === "cancelled") {
          Alert.alert(
            "❌ Request Cancelled",
            "Your request has been cancelled.",
          );
          setActiveBooking(null);
          setWaitingForMechanic(false);
          setIsTracking(false);
          setCurrentTrackingModal(null);
          loadBookings();
        }
      }
    });

    // Listen for mechanic location updates
    socket.on(
      "mechanic:location:update",
      (data: {
        bookingId: string;
        location: { lat: number; lng: number };
        eta: number;
      }) => {
        console.log("Mechanic location update:", data);

        if (data.bookingId === activeBooking?.id) {
          const newLocation = {
            latitude: data.location.lat,
            longitude: data.location.lng,
          };
          setMechanicLocation(newLocation);

          setActiveBooking((prev: any) =>
            prev
              ? {
                  ...prev,
                  mechanic_location: data.location,
                  eta_minutes: data.eta,
                }
              : null,
          );

          // Ensure tracking map is shown
          setCurrentTrackingModal("tracking");
          setIsTracking(true);

          // Auto-fit map bounds when location updates
          if (mapRef.current && coords && newLocation) {
            mapRef.current.fitToCoordinates([coords, newLocation], {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            });
          }
        }
      },
    );

    return () => {
      socket.off("booking:accepted");
      socket.off("booking:status:updated");
      socket.off("mechanic:location:update");
      if (locationUpdateInterval.current) {
        clearInterval(locationUpdateInterval.current);
      }
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [user, activeBooking]);

  // Timer effect for waiting screen
  useEffect(() => {
    if (waitingForMechanic && activeBooking) {
      setTimeRemaining(120);

      const interval: any = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            cancelActiveBooking();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setTimerInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }
  }, [waitingForMechanic, activeBooking]);

  async function checkActiveBooking() {
    try {
      const { data } = await api.get(`/bookings/customer/${user?.id}`);
      const active = data.find(
        (b: Booking) => b.status !== "completed" && b.status !== "cancelled",
      );

      if (active) {
        console.log("Active booking found:", active);
        setActiveBooking(active);

        if (
          active.status === "accepted" ||
          active.status === "on_the_way" ||
          active.status === "arrived"
        ) {
          setIsTracking(true);
          setCurrentTrackingModal("tracking");
          startTrackingMechanic(active);
          if (active.status === "arrived") {
            setShowOTPModal(true);
          }
        } else if (active.status === "requested") {
          setWaitingForMechanic(true);
          setCurrentTrackingModal("waiting");
          await fetchNearbyMechanicsForMap();
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

  async function fetchNearbyMechanicsForMap() {
    if (!coords) return;

    try {
      const { data } = await api.get("/mechanics/nearby", {
        params: {
          lat: coords.latitude,
          lng: coords.longitude,
          radiusKm: 10,
        },
      });
      setNearbyMechanics(data || []);
    } catch (error) {
      console.error("Failed to fetch mechanics for map:", error);
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

  const handleLocationSelect = (location: {
    latitude: number;
    longitude: number;
    address: string;
    isCurrentLocation?: boolean;
    savedLocationId?: string;
  }) => {
    setSelectedLocation(location);
    setCoords({
      latitude: location.latitude,
      longitude: location.longitude,
    });
  };

  async function createBooking(service: ServiceItem) {
    const locationToUse =
      selectedLocation ||
      (coords
        ? {
            latitude: coords.latitude,
            longitude: coords.longitude,
            address: "Live GPS location",
            isCurrentLocation: true,
          }
        : null);

    if (!locationToUse) {
      Alert.alert("Location missing", "Please select a location first.");
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
        mechanicId: null,
        serviceId: service.id,
        issueNote: issueNote || `${service.name} assistance needed`,
        customerLat: locationToUse.latitude,
        customerLng: locationToUse.longitude,
        customerAddress: locationToUse.address,
        status: "requested",
        savedLocationId: locationToUse.savedLocationId,
      };

      const { data } = await api.post("/bookings", payload);
      setActiveBooking(data);
      setWaitingForMechanic(true);
      setCurrentTrackingModal("waiting");
      socket.emit("join:booking", data.id);
      await fetchNearbyMechanicsForMap();

      Alert.alert(
        "Request Sent",
        "Looking for nearby mechanics... You'll be notified when one accepts your request.",
      );
      setIssueNote("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create booking");
      setWaitingForMechanic(false);
      setSelectedService(null);
      setCurrentTrackingModal(null);
    } finally {
      setCreatingBooking(false);
    }
  }

  function startTrackingMechanic(booking: Booking) {
    if (booking.mechanic_id) {
      console.log("Starting tracking for mechanic:", booking.mechanic_id);
      socket.emit("join:mechanic", booking.mechanic_id);
    }
  }

  async function handleVerifyOTP() {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit OTP code");
      return;
    }

    setCompletingService(true);
    try {
      const response = await api.post(
        `/bookings/${activeBooking?.id}/verify-otp`,
        {
          otp: otpCode,
        },
      );

      if (response.data.success) {
        setShowOTPModal(false);
        setOtpCode("");
        setCompletedBookingId(activeBooking?.id);
        setActiveBooking((prev: any) => ({ ...prev, status: "completed" }));
        setShowRatingModal(true);
        setIsTracking(false);
        setCurrentTrackingModal(null);

        Alert.alert(
          "✓ Service Completed!",
          "Please rate your experience with the mechanic.",
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Verification Failed",
        error.response?.data?.error || "Invalid OTP. Please try again.",
      );
    } finally {
      setCompletingService(false);
    }
  }

  async function submitRating() {
    if (customerRating === 0) {
      Alert.alert("Error", "Please rate your experience");
      return;
    }

    setCompletingService(true);
    try {
      await api.post(`/bookings/${completedBookingId}/add-rating`, {
        rating: customerRating,
        review: customerReview.trim() || undefined,
      });

      Alert.alert(
        "Thank You!",
        "Your feedback has been submitted successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              setShowRatingModal(false);
              setCustomerRating(0);
              setCustomerReview("");
              setCompletedBookingId(null);
              setActiveBooking(null);
              setWaitingForMechanic(false);
              setIsTracking(false);
              setCurrentTrackingModal(null);
              loadBookings();
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to submit rating",
      );
    } finally {
      setCompletingService(false);
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
              setIsTracking(false);
              setCurrentTrackingModal(null);
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
console.log(activeBooking)
  async function handleLogout() {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => logout() },
    ]);
  }

  // Render Waiting Screen with Map
  const renderWaitingScreen = () => (
    <Modal
      visible={currentTrackingModal === "waiting"}
      transparent={false}
      animationType="slide"
      onRequestClose={() => {
        if (currentTrackingModal === "waiting") {
          cancelActiveBooking();
        }
      }}
    >
      <SafeAreaView style={styles.waitingContainer}>
        <View style={styles.waitingHeader}>
          <Text style={styles.waitingHeaderTitle}>Finding a Mechanic</Text>
          <TouchableOpacity
            onPress={cancelActiveBooking}
            style={styles.waitingCancelButton}
          >
            <Ionicons name="close" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.mapContainer}>
          {coords && (
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              showsUserLocation={true}
              showsMyLocationButton={false}
            >
              <Marker coordinate={coords} pinColor="#3B82F6">
                <View style={styles.userMarker}>
                  <Ionicons name="person" size={20} color="#FFF" />
                </View>
              </Marker>

              {nearbyMechanics.map((mechanic: any) => (
                <Marker
                  key={mechanic.id}
                  coordinate={{
                    latitude: mechanic.current_lat,
                    longitude: mechanic.current_lng,
                  }}
                  pinColor={mechanic.is_online ? "#10B981" : "#EF4444"}
                >
                  <View style={styles.mechanicMarker}>
                    <Ionicons name="construct" size={16} color="#FFF" />
                  </View>
                  <Callout>
                    <View style={styles.calloutContainer}>
                      <Text style={styles.calloutName}>
                        {mechanic.full_name}
                      </Text>
                      <Text style={styles.calloutDistance}>
                        {mechanic.distance_km?.toFixed(1)} km away
                      </Text>
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>
          )}
        </View>

        <View style={styles.waitingStatusCard}>
          <View style={styles.timerContainer}>
            <View style={styles.timerCircle}>
              <Text style={styles.timerText}>
                {Math.floor(timeRemaining / 60)}:
                {(timeRemaining % 60).toString().padStart(2, "0")}
              </Text>
            </View>
            <Text style={styles.timerLabel}>Time remaining</Text>
            <View style={styles.timerProgress}>
              <View
                style={[
                  styles.timerProgressFill,
                  { width: `${(timeRemaining / 120) * 100}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.searchingContainer}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={styles.searchingText}>
              Searching for nearby mechanics...
            </Text>
            <Text style={styles.searchingSubtext}>
              {nearbyMechanics.length} mechanic
              {nearbyMechanics.length !== 1 ? "s" : ""} available nearby
            </Text>
          </View>

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

  // Render Live Tracking Screen
  const renderTrackingScreen = () => {
    console.log(
      "Rendering tracking screen - currentTrackingModal:",
      currentTrackingModal,
      "activeBooking status:",
      activeBooking?.status,
      "mechanicLocation:",
      mechanicLocation,
    );

    if (currentTrackingModal !== "tracking" || !activeBooking) {
      return null;
    }

    const distance =
      mechanicLocation && coords
        ? calculateDistance(
            coords.latitude,
            coords.longitude,
            mechanicLocation.latitude,
            mechanicLocation.longitude,
          )
        : null;

    // If we have mechanic location, show the map with route
    const hasValidLocations =
      coords && (mechanicLocation || activeBooking.mechanic_location);
    const mechanicLatLng =
      mechanicLocation ||
      (activeBooking.mechanic_location
        ? {
            latitude: activeBooking.mechanic_location.lat,
            longitude: activeBooking.mechanic_location.lng,
          }
        : null);

    return (
      <Modal
        visible={true}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          if (currentTrackingModal === "tracking") {
            cancelActiveBooking();
          }
        }}
      >
        <SafeAreaView style={styles.trackingContainer}>
          <View style={styles.trackingHeader}>
            <Text style={styles.trackingTitle}>
              {activeBooking.status === "accepted" && "✓ Mechanic Assigned!"}
              {activeBooking.status === "on_the_way" &&
                "🚗 Mechanic is Coming!"}
              {activeBooking.status === "arrived" && "📍 Mechanic Has Arrived!"}
            </Text>
            <TouchableOpacity
              onPress={cancelActiveBooking}
              style={styles.trackingCancelButton}
            >
              <Ionicons name="close" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <View style={styles.mapContainer}>
            {hasValidLocations && mechanicLatLng ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: (coords.latitude + mechanicLatLng.latitude) / 2,
                  longitude: (coords.longitude + mechanicLatLng.longitude) / 2,
                  latitudeDelta:
                    Math.abs(coords.latitude - mechanicLatLng.latitude) * 1.5,
                  longitudeDelta:
                    Math.abs(coords.longitude - mechanicLatLng.longitude) * 1.5,
                }}
                showsUserLocation={true}
                showsMyLocationButton={false}
              >
                {/* Customer Location Marker */}
                <Marker coordinate={coords} pinColor="#3B82F6">
                  <View style={styles.customerMarker}>
                    <Ionicons name="home" size={20} color="#FFF" />
                  </View>
                  <Callout>
                    <Text style={styles.calloutText}>Your Location</Text>
                  </Callout>
                </Marker>

                {/* Mechanic Location Marker */}
                <Marker coordinate={mechanicLatLng} pinColor="#F59E0B">
                  <View style={styles.trackingMechanicMarker}>
                    <Ionicons name="car" size={20} color="#FFF" />
                  </View>
                  <Callout>
                    <Text style={styles.calloutText}>Mechanic Location</Text>
                    {distance && (
                      <Text style={styles.calloutDistance}>
                        {distance < 1
                          ? `${Math.round(distance * 1000)}m`
                          : `${distance.toFixed(1)}km`}{" "}
                        away
                      </Text>
                    )}
                  </Callout>
                </Marker>

                {/* Route Directions */}
                {GOOGLE_MAPS_API_KEY && mechanicLatLng && (
                  <MapViewDirections
                    origin={mechanicLatLng}
                    destination={coords}
                    apikey={GOOGLE_MAPS_API_KEY}
                    strokeWidth={4}
                    strokeColor="#10B981"
                    mode="DRIVING"
                    optimizeWaypoints={true}
                    onReady={(result) => {
                      console.log(
                        "Route ready - distance:",
                        result.distance,
                        "duration:",
                        result.duration,
                      );
                      setRouteInfo({
                        distance: result.distance,
                        duration: result.duration,
                      });
                      if (mapRef.current) {
                        mapRef.current.fitToCoordinates(
                          [coords, mechanicLatLng],
                          {
                            edgePadding: {
                              top: 100,
                              right: 100,
                              bottom: 100,
                              left: 100,
                            },
                            animated: true,
                          },
                        );
                      }
                    }}
                    onError={(errorMessage) => {
                      console.error("Route error:", errorMessage);
                      // Fall back to straight line on error
                      setRouteInfo(null);
                    }}
                    resetOnChange={false}
                    timePrecision="now"
                  />
                )}
              </MapView>
            ) : (
              <View style={styles.loadingMapContainer}>
                <ActivityIndicator size="large" color="#0F172A" />
                <Text style={styles.loadingMapText}>
                  {!coords
                    ? "Getting your location..."
                    : "Waiting for mechanic location..."}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.trackingInfoCard}>
            <View style={styles.trackingInfoRow}>
              <Ionicons name="person" size={20} color="#64748B" />
              <Text style={styles.trackingInfoLabel}>Mechanic:</Text>
              <Text style={styles.trackingInfoValue}>
                {activeBooking.mechanic?.full_name || "Loading..."}
              </Text>
            </View>

            <View style={styles.trackingInfoRow}>
              <Ionicons name="time" size={20} color="#64748B" />
              <Text style={styles.trackingInfoLabel}>Status:</Text>
              <Text style={[styles.trackingInfoValue, styles.statusValue]}>
                {activeBooking.status?.replace("_", " ").toUpperCase()}
              </Text>
            </View>

            {distance !== null && distance > 0 && (
              <View style={styles.trackingInfoRow}>
                <Ionicons name="location" size={20} color="#64748B" />
                <Text style={styles.trackingInfoLabel}>Distance:</Text>
                <Text style={styles.trackingInfoValue}>
                  {distance < 1
                    ? `${Math.round(distance * 1000)}m`
                    : `${distance.toFixed(1)}km`}
                </Text>
              </View>
            )}

            {routeInfo && routeInfo.duration > 0 && (
              <View style={styles.trackingInfoRow}>
                <Ionicons name="car" size={20} color="#64748B" />
                <Text style={styles.trackingInfoLabel}>ETA:</Text>
                <Text style={styles.trackingInfoValue}>
                  {routeInfo.duration < 1
                    ? "< 1 minute"
                    : `~${Math.round(routeInfo.duration)} minutes`}
                </Text>
              </View>
            )}

            {activeBooking.status === "arrived" && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => setShowOTPModal(true)}
              >
                <Text style={styles.completeButtonText}>
                  Complete Service with OTP
                </Text>
              </TouchableOpacity>
            )}

            {/* Show cancel button for tracking screen */}
            {activeBooking.status !== "arrived" && (
              <TouchableOpacity
                style={styles.cancelTrackingButton}
                onPress={cancelActiveBooking}
              >
                <Text style={styles.cancelTrackingButtonText}>
                  Cancel Service
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // Render OTP Modal
  const renderOTPModal = () => (
    <Modal visible={showOTPModal} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons name="shield-checkmark" size={50} color="#10B981" />
            <Text style={styles.modalTitle}>Verify Service Completion</Text>
            <Text style={styles.modalSubtitle}>
              Ask the mechanic for the 6-digit OTP code
            </Text>
          </View>

          <TextInput
            style={styles.otpInput}
            placeholder="Enter 6-digit OTP"
            value={otpCode}
            onChangeText={setOtpCode}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
            autoFocus
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelModalButton]}
              onPress={() => {
                setShowOTPModal(false);
                setOtpCode("");
              }}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.verifyModalButton,
                completingService && styles.disabledButton,
              ]}
              onPress={handleVerifyOTP}
              disabled={completingService}
            >
              {completingService ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.verifyModalButtonText}>
                  Verify & Complete
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render Rating Modal
  const renderRatingModal = () => (
    <Modal visible={showRatingModal} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <ScrollView contentContainerStyle={styles.modalScrollContent}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="star" size={50} color="#FBBF24" />
              <Text style={styles.modalTitle}>Rate Your Experience</Text>
              <Text style={styles.modalSubtitle}>
                How was your service with{" "}
                {activeBooking?.mechanic?.full_name || "the mechanic"}?
              </Text>
            </View>

            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setCustomerRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= customerRating ? "star" : "star-outline"}
                    size={48}
                    color="#FBBF24"
                  />
                </TouchableOpacity>
              ))}
            </View>

            {customerRating > 0 && (
              <View style={styles.ratingLabel}>
                <Text style={styles.ratingLabelText}>
                  {customerRating === 1 && "Poor"}
                  {customerRating === 2 && "Fair"}
                  {customerRating === 3 && "Good"}
                  {customerRating === 4 && "Very Good"}
                  {customerRating === 5 && "Excellent!"}
                </Text>
              </View>
            )}

            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience (optional)"
              value={customerReview}
              onChangeText={setCustomerReview}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.submitRatingButton,
                completingService && styles.disabledButton,
              ]}
              onPress={submitRating}
              disabled={completingService}
            >
              {completingService ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitRatingButtonText}>
                  Submit Feedback
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => {
                setShowRatingModal(false);
                setCustomerRating(0);
                setCustomerReview("");
                setCompletedBookingId(null);
                setActiveBooking(null);
                setIsTracking(false);
                setCurrentTrackingModal(null);
                loadBookings();
              }}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

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
      {renderOTPModal()}
      {renderRatingModal()}

      <LocationPicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelectLocation={handleLocationSelect}
        currentLocation={
          coords
            ? {
                latitude: coords.latitude,
                longitude: coords.longitude,
                address: "Current Location",
              }
            : null
        }
      />

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

            <TouchableOpacity
              style={styles.locationSelector}
              onPress={() => setShowLocationPicker(true)}
            >
              <Ionicons name="location-outline" size={24} color="#0F172A" />
              <View style={styles.locationSelectorText}>
                <Text style={styles.locationSelectorLabel}>
                  Service Location
                </Text>
                <Text style={styles.locationSelectorAddress} numberOfLines={1}>
                  {selectedLocation?.address ||
                    (coords ? "Current Location" : "Select a location")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748B" />
            </TouchableOpacity>

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

  locationSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  locationSelectorText: { flex: 1, marginLeft: 12 },
  locationSelectorLabel: { fontSize: 12, color: "#64748B", marginBottom: 2 },
  locationSelectorAddress: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
  },

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

  // Waiting Screen Styles
  waitingContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  waitingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  waitingHeaderTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  waitingCancelButton: { padding: 8 },

  mapContainer: { height: height * 0.5, backgroundColor: "#E2E8F0" },
  map: { flex: 1 },

  userMarker: {
    backgroundColor: "#3B82F6",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  mechanicMarker: {
    backgroundColor: "#10B981",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  customerMarker: {
    backgroundColor: "#3B82F6",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  trackingMechanicMarker: {
    backgroundColor: "#F59E0B",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  calloutContainer: { padding: 8, minWidth: 120 },
  calloutName: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  calloutDistance: { fontSize: 12, color: "#64748B", marginTop: 2 },
  calloutText: { fontSize: 12, fontWeight: "600", color: "#0F172A" },

  waitingStatusCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    marginTop: -20,
  },
  timerContainer: { alignItems: "center", marginBottom: 24 },
  timerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  timerText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    fontFamily: "monospace",
  },
  timerLabel: { fontSize: 14, color: "#64748B" },
  timerProgress: {
    width: "100%",
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    marginTop: 12,
    overflow: "hidden",
  },
  timerProgressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 2,
  },

  searchingContainer: { alignItems: "center", marginBottom: 24 },
  searchingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 12,
  },
  searchingSubtext: { fontSize: 14, color: "#64748B", marginTop: 4 },

  serviceInfoBox: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  serviceInfoText: { fontSize: 14, color: "#0F172A", marginTop: 4 },
  cancelButton: {
    backgroundColor: "#EF4444",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },

  // Tracking Screen Styles
  trackingContainer: { flex: 1, backgroundColor: "#F8FAFC" },
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
  trackingCancelButton: { padding: 8 },

  trackingInfoCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  trackingInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  trackingInfoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    width: 80,
    marginLeft: 8,
  },
  trackingInfoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
    flex: 1,
  },
  statusValue: { color: "#10B981", fontWeight: "700" },

  completeButton: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  completeButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  cancelTrackingButton: {
    backgroundColor: "#EF4444",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  cancelTrackingButtonText: { color: "#FFF", fontSize: 14, fontWeight: "600" },

  loadingMapContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  loadingMapText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalScrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  modalHeader: { alignItems: "center", marginBottom: 24 },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
  },
  otpInput: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 24,
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  starButton: { padding: 8 },
  ratingLabel: { alignItems: "center", marginBottom: 20 },
  ratingLabelText: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  reviewInput: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 14,
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelModalButton: { backgroundColor: "#F1F5F9" },
  cancelModalButtonText: { color: "#64748B", fontSize: 16, fontWeight: "600" },
  verifyModalButton: { backgroundColor: "#10B981" },
  verifyModalButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  submitRatingButton: {
    backgroundColor: "#0F172A",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  submitRatingButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  skipButton: { paddingVertical: 12, alignItems: "center" },
  skipButtonText: { color: "#64748B", fontSize: 14 },
  disabledButton: { opacity: 0.6 },
});
