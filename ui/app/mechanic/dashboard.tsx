/* eslint-disable react/no-unescaped-entities */
import { useEffect, useState, useCallback, useRef } from "react";
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
  TextInput,
  ScrollView,
} from "react-native";
import * as Location from "expo-location";
import { api } from "@/lib/api";
import { Booking } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import { socket } from "@/lib/socket";
import { Ionicons } from "@expo/vector-icons";

// Distance calculation function
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export default function MechanicDashboard() {
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [myJobs, setMyJobs] = useState<Booking[]>([]);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"available" | "myJobs">("available");
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const { user, logout } = useAuth();
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState("");
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [customerRating, setCustomerRating] = useState(0);
  const [customerReview, setCustomerReview] = useState("");
  const [selectedCompletedBooking, setSelectedCompletedBooking] = useState<any>(null);
  const [showRatingsDetailModal, setShowRatingsDetailModal] = useState(false);
  const [selectedRatingsBooking, setSelectedRatingsBooking] = useState<any>(null);
  
  // Add activeBooking state
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  
  let locationInterval: any;

  // Function to calculate ETA based on current location and customer location
  function calculateETA(mechanicLat: number, mechanicLng: number, customerLat: number, customerLng: number): number {
    const distance = calculateDistance(mechanicLat, mechanicLng, customerLat, customerLng);
    // Assuming average speed of 30 km/h in city
    const etaMinutes = Math.ceil((distance / 30) * 60);
    return Math.min(etaMinutes, 30); // Cap at 30 minutes
  }

  async function generateOTPForCompletion(bookingId: string) {
    try {
      const response = await api.post(`/bookings/${bookingId}/generate-otp`, {});
      if (response.data.success) {
        setGeneratedOTP(response.data.otp);
        setShowOTPModal(true);
        
        Alert.alert(
          "OTP Generated",
          `Share this OTP with the customer: ${response.data.otp}\n\nThis OTP will expire in 10 minutes.`,
          [{ text: "OK" }]
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to generate OTP");
    }
  }

  async function rateCustomer(booking: any) {
    setSelectedCompletedBooking(booking);
    setShowRatingModal(true);
  }

  async function submitCustomerRating() {
    if (customerRating === 0) {
      Alert.alert("Error", "Please rate the customer");
      return;
    }

    try {
      await api.post(`/bookings/${selectedCompletedBooking.id}/mechanic-rating`, {
        rating: customerRating,
        review: customerReview.trim() || undefined,
      });
      
      Alert.alert("Thank You!", "Your feedback has been submitted.");
      setShowRatingModal(false);
      setCustomerRating(0);
      setCustomerReview("");
      loadMyJobs();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to submit rating");
    }
  }

  async function updateStatus(bookingId: string, status: "on_the_way" | "arrived" | "completed") {
    try {
      const response = await api.patch(`/bookings/${bookingId}/status`, { status });
      const updatedBooking = response.data;

      socket.emit("booking:status:update", {
        bookingId: bookingId,
        status: status,
        timestamp: new Date().toISOString(),
      });

      if (status === "arrived") {
        await generateOTPForCompletion(bookingId);
      }

      Alert.alert("Updated", `Booking marked as ${status.replace("_", " ")}.`);
      await loadMyJobs();
      
      // Update active booking if needed
      if (status === "completed" || status === "arrived") {
        const active = myJobs.find(job => job.id === bookingId && job.status !== "completed");
        setActiveBooking(active || null);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      Alert.alert("Error", "Failed to update status");
    }
  }

  // View ratings details
  const viewRatingsDetails = (booking: Booking) => {
    setSelectedRatingsBooking(booking);
    setShowRatingsDetailModal(true);
  };

  const renderStars = (rating: number | null | undefined) => {
    if (!rating) return null;
    
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons 
          key={i} 
          name={i <= rating ? "star" : "star-outline"} 
          size={14} 
          color="#FBBF24" 
        />
      );
    }
    return <View style={{ flexDirection: 'row', gap: 2 }}>{stars}</View>;
  };

  // Send location update for a specific booking
  const sendLocationUpdate = async (bookingId: string) => {
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
      
      // Find the active job details
      const activeJob = myJobs.find(job => job.id === bookingId);
      
      if (activeJob && activeJob.customer_lat && activeJob.customer_lng) {
        const eta = calculateETA(newLocation.lat, newLocation.lng, activeJob.customer_lat, activeJob.customer_lng);
        
        const locationData = {
          bookingId: bookingId,
          location: {
            lat: newLocation.lat,
            lng: newLocation.lng,
          },
          eta: eta,
          mechanicId: user?.id,
          timestamp: new Date().toISOString()
        };
        
        console.log("Sending location update for booking:", bookingId, locationData);
        socket.emit("mechanic:location:update", locationData);
        socket.emit("mechanic:location", locationData);
        
        // Also update location in API
        await api.patch(`/mechanics/${user?.id}/location`, newLocation);
      }
    } catch (error) {
      console.error("Failed to send location update:", error);
    }
  };

  // Start periodic location tracking for active jobs
  useEffect(() => {
    // Find active job (accepted, on_the_way, or arrived but not completed)
    const activeJob = myJobs.find(job => 
      job.status === 'accepted' || job.status === 'on_the_way' || job.status === 'arrived'
    );
    
    setActiveBooking(activeJob);
    
    if (activeJob && online) {
      console.log("Starting location tracking for active job:", activeJob.id);
      
      // Send initial location immediately
      sendLocationUpdate(activeJob.id);
      
      // Set up interval for periodic updates
      const interval = setInterval(() => {
        sendLocationUpdate(activeJob.id);
      }, 5000); // Update every 5 seconds
      
      return () => {
        console.log("Cleaning up location tracking interval");
        clearInterval(interval);
      };
    }
  }, [myJobs, online]);

  useEffect(() => {
    if (user) {
      loadData();
      getCurrentLocation();
    }

    socket.on("booking:new", (booking: any) => {
      console.log("New booking available:", booking);
      
      if (booking.auto_cancelled || booking.status === 'cancelled') {
        console.log("Booking was auto-cancelled:", booking);
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
    };
  }, [user]);

  useEffect(() => {
    if (online) {
      const refreshInterval = setInterval(() => {
        if (activeTab === "available") {
          loadOpenJobs();
        }
      }, 10000);
      
      return () => clearInterval(refreshInterval);
    }
  }, [online, activeTab]);

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
          Alert.alert("Location Required", "Please enable location permissions to go online.");
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
        Alert.alert("Status Updated", `You are now online and will receive booking requests.`);
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
      const response = await api.patch(`/bookings/${selectedBooking.id}/assign`, {
        mechanicId: user?.id,
        etaMinutes: 15,
        status: "accepted",
      });

      socket.emit("booking:accept", {
        bookingId: selectedBooking.id,
        mechanic: {
          id: user?.id,
          full_name: user?.full_name,
          phone: user?.phone,
        },
        eta: 15,
      });

      socket.emit("join:booking", selectedBooking.id);

      Alert.alert("✓ Accepted!", "You have accepted the job. Navigate to the customer's location now.");

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

  const renderJobCard = ({ item }: { item: Booking }) => {
    const isMyJob = activeTab === "myJobs";
    const hasCustomerRating = item.customer_rating;
    const hasMechanicRating = item.mechanic_rating;
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Service Request #{item.id.slice(0, 8)}</Text>
          <View style={[
            styles.statusBadge,
            item.status === 'completed' && styles.completedBadge,
            item.status === 'cancelled' && styles.cancelledBadge,
            item.status === 'accepted' && styles.acceptedBadge,
            item.status === 'on_the_way' && styles.onWayBadge,
            item.status === 'arrived' && styles.arrivedBadge,
          ]}>
            <Text style={styles.statusBadgeText}>
              {item.status?.replaceAll("_", " ").toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.cardMeta}>Issue: {item.issue_note || "Road assistance needed"}</Text>
        
        {item.customer && (
          <Text style={styles.cardMeta}>Customer: {item.customer.full_name}</Text>
        )}
        
        {item.customer_address && (
          <Text style={styles.cardMeta}>📍 {item.customer_address}</Text>
        )}
        
        {item.customer_lat && item.customer_lng && currentLocation && (
          <Text style={styles.distanceText}>
            📍 Distance: {calculateDistance(
              currentLocation.lat,
              currentLocation.lng,
              item.customer_lat,
              item.customer_lng,
            ).toFixed(1)} km away
          </Text>
        )}

        {/* Rating Summary */}
        {(item.status === 'completed' || hasCustomerRating || hasMechanicRating) && (
          <TouchableOpacity 
            style={styles.ratingSummary}
            onPress={() => viewRatingsDetails(item)}
          >
            <View style={styles.ratingSummaryLeft}>
              <Ionicons name="star" size={16} color="#FBBF24" />
              <Text style={styles.ratingSummaryText}>
                {hasCustomerRating ? `${item.customer_rating?.toFixed(1)} ★` : 'Rate Customer'}
              </Text>
            </View>
            <View style={styles.ratingSummaryRight}>
              {hasMechanicRating && (
                <View style={styles.mechanicRatingBadge}>
                  <Ionicons name="person-outline" size={12} color="#10B981" />
                  <Text style={styles.mechanicRatingText}>
                    {item.mechanic_rating?.toFixed(1)} ★
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        )}

        {/* Action Buttons for Available Jobs */}
        {!isMyJob && item.status === "requested" && (
          <TouchableOpacity style={styles.acceptButton} onPress={() => acceptJob(item)}>
            <Text style={styles.acceptButtonText}>Accept Job</Text>
          </TouchableOpacity>
        )}

        {/* Status Update Buttons for My Jobs */}
        {isMyJob && item.status !== "completed" && item.status !== "cancelled" && (
          <View style={styles.row}>
            {item.status === "accepted" && (
              <TouchableOpacity
                style={[styles.smallBtn, styles.primaryBtn]}
                onPress={() => updateStatus(item.id, "on_the_way")}
              >
                <Text style={styles.smallBtnText}>Start Journey</Text>
              </TouchableOpacity>
            )}
            {item.status === "on_the_way" && (
              <TouchableOpacity
                style={[styles.smallBtn, styles.primaryBtn]}
                onPress={() => updateStatus(item.id, "arrived")}
              >
                <Text style={styles.smallBtnText}>Arrived</Text>
              </TouchableOpacity>
            )}
            {item.status === "arrived" && (
              <>
                <TouchableOpacity
                  style={[styles.smallBtn, styles.otpBtn]}
                  onPress={() => generateOTPForCompletion(item.id)}
                >
                  <Ionicons name="key-outline" size={16} color="#FFF" />
                  <Text style={[styles.smallBtnText, { color: "#FFF" }]}>Show OTP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, styles.completeBtn]}
                  onPress={() => updateStatus(item.id, "completed")}
                >
                  <Text style={[styles.smallBtnText, { color: "#FFF" }]}>Complete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Rate Customer Button for Completed Jobs */}
        {isMyJob && item.status === "completed" && !item.mechanic_rating && (
          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: "#8B5CF6", marginTop: 12 }]}
            onPress={() => rateCustomer(item)}
          >
            <Ionicons name="star-outline" size={18} color="#FFF" />
            <Text style={styles.acceptButtonText}>Rate Customer</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

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
      {/* Accept Job Modal */}
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
                  Service: {selectedBooking.service?.name || "Roadside Assistance"}
                </Text>
                <Text style={styles.modalDetailText}>
                  Issue: {selectedBooking.issue_note || "Not specified"}
                </Text>
                <Text style={styles.modalDetailText}>
                  Location: {selectedBooking.customer_address || "Address provided"}
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

      {/* OTP Display Modal */}
      <Modal visible={showOTPModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.otpHeader}>
              <Ionicons name="key" size={40} color="#10B981" />
              <Text style={styles.modalTitle}>Service Completion OTP</Text>
            </View>
            <Text style={styles.otpDisplayText}>{generatedOTP}</Text>
            <Text style={styles.otpInstruction}>
              Share this OTP with the customer to complete the service
            </Text>
            <Text style={styles.otpExpiry}>Valid for 10 minutes</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowOTPModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rate Customer Modal */}
      <Modal visible={showRatingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: "90%" }]}>
            <Text style={styles.modalTitle}>Rate Customer</Text>
            <Text style={styles.modalText}>
              How was your experience with this customer?
            </Text>
            
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setCustomerRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= customerRating ? "star" : "star-outline"}
                    size={40}
                    color="#FBBF24"
                  />
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience (optional)"
              value={customerReview}
              onChangeText={setCustomerReview}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowRatingModal(false);
                  setCustomerRating(0);
                  setCustomerReview("");
                }}
              >
                <Text style={styles.modalCancelText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalAcceptButton]}
                onPress={submitCustomerRating}
              >
                <Text style={styles.modalAcceptText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ratings Detail Modal */}
      <Modal visible={showRatingsDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.modalContent, { width: "90%", maxWidth: 500 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ratings & Reviews</Text>
                <TouchableOpacity onPress={() => setShowRatingsDetailModal(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {selectedRatingsBooking && (
                <View style={styles.ratingsBody}>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingInfoText}>
                      Booking #{selectedRatingsBooking.id.slice(0, 8)}
                    </Text>
                    <Text style={styles.bookingInfoDate}>
                      {new Date(selectedRatingsBooking.created_at).toLocaleDateString()}
                    </Text>
                  </View>

                  {/* Customer Rating */}
                  <View style={styles.ratingSection}>
                    <View style={styles.ratingHeader}>
                      <View style={styles.ratingTitleContainer}>
                        <Ionicons name="person-outline" size={20} color="#0F172A" />
                        <Text style={styles.ratingTitle}>Customer's Rating</Text>
                      </View>
                      <Text style={styles.ratingRoleBadge}>Of You</Text>
                    </View>
                    
                    <View style={styles.ratingContent}>
                      {selectedRatingsBooking.customer_rating ? (
                        <>
                          <View style={styles.ratingStarsLarge}>
                            {renderStars(selectedRatingsBooking.customer_rating)}
                            <Text style={styles.ratingText}>
                              ({selectedRatingsBooking.customer_rating.toFixed(1)})
                            </Text>
                          </View>
                          {selectedRatingsBooking.customer_review && (
                            <View style={styles.reviewContainer}>
                              <Text style={styles.reviewLabel}>Customer's Review:</Text>
                              <Text style={styles.reviewText}>
                                "{selectedRatingsBooking.customer_review}"
                              </Text>
                            </View>
                          )}
                        </>
                      ) : (
                        <View style={styles.noRatingContainer}>
                          <Ionicons name="star-outline" size={32} color="#CBD5E1" />
                          <Text style={styles.noRatingText}>No rating yet</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Your Rating of Customer */}
                  <View style={styles.ratingSection}>
                    <View style={styles.ratingHeader}>
                      <View style={styles.ratingTitleContainer}>
                        <Ionicons name="construct-outline" size={20} color="#0F172A" />
                        <Text style={styles.ratingTitle}>Your Rating</Text>
                      </View>
                      <Text style={[styles.ratingRoleBadge, styles.mechanicBadge]}>Of Customer</Text>
                    </View>
                    
                    <View style={styles.ratingContent}>
                      {selectedRatingsBooking.mechanic_rating ? (
                        <>
                          <View style={styles.ratingStarsLarge}>
                            {renderStars(selectedRatingsBooking.mechanic_rating)}
                            <Text style={styles.ratingText}>
                              ({selectedRatingsBooking.mechanic_rating.toFixed(1)})
                            </Text>
                          </View>
                          {selectedRatingsBooking.mechanic_review && (
                            <View style={styles.reviewContainer}>
                              <Text style={styles.reviewLabel}>Your Review:</Text>
                              <Text style={styles.reviewText}>
                                "{selectedRatingsBooking.mechanic_review}"
                              </Text>
                            </View>
                          )}
                        </>
                      ) : (
                        <View style={styles.noRatingContainer}>
                          <Ionicons name="time-outline" size={32} color="#CBD5E1" />
                          <Text style={styles.noRatingText}>You haven't rated yet</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.closeRatingsButton}
                    onPress={() => setShowRatingsDetailModal(false)}
                  >
                    <Text style={styles.closeRatingsButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mechanic Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <TouchableOpacity
          style={[styles.statusButton, online ? styles.onlineBtn : styles.offlineBtn]}
          onPress={toggleAvailability}
        >
          <View style={styles.statusDot} />
          <Text style={styles.statusButtonText}>
            {online ? "Online" : "Offline"}
          </Text>
        </TouchableOpacity>
        {online && currentLocation && (
          <View style={styles.locationActive}>
            <Ionicons name="location" size={14} color="#10B981" />
            <Text style={styles.locationText}>Location active</Text>
          </View>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "available" && styles.activeTab]}
          onPress={() => setActiveTab("available")}
        >
          <Text style={[styles.tabText, activeTab === "available" && styles.activeTabText]}>
            Available ({jobs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "myJobs" && styles.activeTab]}
          onPress={() => setActiveTab("myJobs")}
        >
          <Text style={[styles.tabText, activeTab === "myJobs" && styles.activeTabText]}>
            My Jobs ({myJobs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Jobs List */}
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
        renderItem={renderJobCard}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyStateText}>
              {activeTab === "available"
                ? "No available jobs at the moment"
                : "You have no active jobs"}
            </Text>
            {activeTab === "available" && online && (
              <Text style={styles.emptyStateSubtext}>
                New requests will appear here automatically
              </Text>
            )}
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
  content: { padding: 16, paddingBottom: 32 },
  
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  logoutButton: { padding: 8 },
  
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFF",
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFF",
  },
  onlineBtn: { backgroundColor: "#10B981" },
  offlineBtn: { backgroundColor: "#64748B" },
  statusButtonText: { color: "#FFF", fontWeight: "600", fontSize: 14 },
  locationActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  locationText: { fontSize: 12, color: "#10B981", fontWeight: "500" },
  
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", flex: 1 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  completedBadge: { backgroundColor: "#D1FAE5" },
  cancelledBadge: { backgroundColor: "#FEE2E2" },
  acceptedBadge: { backgroundColor: "#DBEAFE" },
  onWayBadge: { backgroundColor: "#FEF3C7" },
  arrivedBadge: { backgroundColor: "#EDE9FE" },
  statusBadgeText: { fontSize: 10, fontWeight: "700", color: "#0F172A" },
  
  cardMeta: { fontSize: 13, color: "#475569", marginTop: 6 },
  distanceText: { fontSize: 12, color: "#10B981", marginTop: 6, fontWeight: "500" },
  
  ratingSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ratingSummaryLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingSummaryText: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
  ratingSummaryRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  mechanicRatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  mechanicRatingText: { fontSize: 11, fontWeight: "600", color: "#10B981" },
  
  acceptButton: {
    backgroundColor: "#0F172A",
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  acceptButtonText: { color: "#FFF", fontWeight: "700", textAlign: "center" },
  
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  smallBtn: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  primaryBtn: { backgroundColor: "#0F172A" },
  otpBtn: { backgroundColor: "#10B981" },
  completeBtn: { backgroundColor: "#8B5CF6" },
  smallBtnText: { fontWeight: "700", fontSize: 12, color: "#FFF" },
  
  emptyState: { padding: 48, alignItems: "center" },
  emptyStateText: { fontSize: 16, fontWeight: "600", color: "#64748B", marginTop: 12 },
  emptyStateSubtext: { fontSize: 14, color: "#94A3B8", textAlign: "center", marginTop: 8 },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#0F172A", marginBottom: 8, textAlign: "center" },
  modalText: { fontSize: 14, color: "#475569", marginBottom: 16, textAlign: "center" },
  modalDetails: {
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalDetailText: { fontSize: 13, color: "#0F172A", marginBottom: 4 },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  modalCancelButton: { backgroundColor: "#F1F5F9" },
  modalCancelText: { color: "#64748B", fontWeight: "600" },
  modalAcceptButton: { backgroundColor: "#0F172A" },
  modalAcceptText: { color: "#FFF", fontWeight: "600" },
  
  // OTP Modal specific
  otpHeader: { alignItems: "center", marginBottom: 16 },
  otpDisplayText: {
    fontSize: 48,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 8,
    color: "#0F172A",
    marginVertical: 20,
  },
  otpInstruction: { fontSize: 14, color: "#64748B", textAlign: "center", marginBottom: 8 },
  otpExpiry: { fontSize: 12, color: "#EF4444", textAlign: "center", marginBottom: 20 },
  modalCloseButton: { backgroundColor: "#0F172A", padding: 12, borderRadius: 8, alignItems: "center" },
  modalCloseText: { color: "#FFF", fontWeight: "600" },
  
  // Rating specific
  ratingContainer: { flexDirection: "row", justifyContent: "center", marginVertical: 20 },
  starButton: { padding: 8 },
  reviewInput: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    marginBottom: 20,
    fontSize: 14,
  },
  
  // Ratings Detail Modal
  ratingsBody: { paddingBottom: 16 },
  bookingInfo: { backgroundColor: "#F1F5F9", padding: 12, borderRadius: 12, marginBottom: 20 },
  bookingInfoText: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  bookingInfoDate: { fontSize: 12, color: "#64748B", marginTop: 4 },
  ratingSection: { marginBottom: 20, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, overflow: "hidden" },
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  ratingTitleContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingTitle: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  ratingRoleBadge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    color: "#2563EB",
    overflow: "hidden",
  },
  mechanicBadge: { backgroundColor: "#F0FDF4", color: "#10B981" },
  ratingContent: { padding: 16 },
  ratingStarsLarge: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  ratingText: { fontSize: 14, fontWeight: "600", color: "#0F172A", marginLeft: 4 },
  reviewContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  reviewLabel: { fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 8 },
  reviewText: { fontSize: 14, color: "#0F172A", lineHeight: 20, fontStyle: "italic" },
  noRatingContainer: { alignItems: "center", paddingVertical: 20 },
  noRatingText: { fontSize: 13, color: "#94A3B8", marginTop: 8 },
  closeRatingsButton: { marginTop: 20, backgroundColor: "#0F172A", padding: 14, borderRadius: 12, alignItems: "center" },
  closeRatingsButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});