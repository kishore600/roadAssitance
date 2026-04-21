/* eslint-disable react/no-unescaped-entities */
// app/(customer)/profile.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  created_at: string;
}

interface BookingHistory {
  id: string;
  status: string;
  created_at: string;
  completed_at?: string;
  service: {
    name: string;
    price: number;
  };
  mechanic?: {
    full_name: string;
    phone: string;
  };
  customer_rating?: number;
  customer_review?: string;
  mechanic_rating?: number;
  mechanic_review?: string;
  total_amount?: number;
}

interface SavedLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookingHistory, setBookingHistory] = useState<BookingHistory[]>([]);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' });
  const [updating, setUpdating] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingHistory | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'locations'>('overview');

  useEffect(() => {
    loadProfileData();
    loadBookingHistory();
    loadSavedLocations();
  }, []);

  const loadProfileData = async () => {
    try {
      const { data } = await api.get(`/customers/${user?.id}`);
      setProfile(data);
      setEditForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadBookingHistory = async () => {
    try {
      const { data } = await api.get(`/bookings/customer/${user?.id}`);
      // Sort by date, most recent first
      const sorted = data.sort((a: BookingHistory, b: BookingHistory) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setBookingHistory(sorted);
    } catch (error) {
      console.error('Failed to load booking history:', error);
    }
  };

  const loadSavedLocations = async () => {
    try {
      const { data } = await api.get(`/customers/${user?.id}/locations`);
      setSavedLocations(data || []);
    } catch (error) {
      console.error('Failed to load saved locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProfileData(), loadBookingHistory(), loadSavedLocations()]);
    setRefreshing(false);
  }, []);

  const handleUpdateProfile = async () => {
    if (!editForm.full_name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setUpdating(true);
    try {
      await api.patch(`/customers/${user?.id}`, {
        full_name: editForm.full_name,
        phone: editForm.phone,
      });
      await loadProfileData();
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    Alert.alert('Change Password', 'This feature will be available soon.');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/customers/${user?.id}`);
              logout();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => logout() },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      case 'accepted':
        return '#3B82F6';
      case 'on_the_way':
        return '#F59E0B';
      case 'arrived':
        return '#8B5CF6';
      default:
        return '#64748B';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'cancelled':
        return 'close-circle';
      case 'accepted':
        return 'person';
      case 'on_the_way':
        return 'car';
      case 'arrived':
        return 'location';
      default:
        return 'time';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color="#FBBF24"
        />
      );
    }
    return <View style={{ flexDirection: 'row', gap: 2 }}>{stars}</View>;
  };

  const renderOverview = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0) || user?.full_name?.charAt(0) || 'U'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.editAvatarButton}
            onPress={() => Alert.alert('Coming Soon', 'Photo upload will be available soon')}
          >
            <Ionicons name="camera" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{profile?.full_name || user?.full_name}</Text>
        <Text style={styles.userEmail}>{profile?.email || user?.email}</Text>
        {profile?.phone && <Text style={styles.userPhone}>{profile.phone}</Text>}
        
        <TouchableOpacity 
          style={styles.editProfileButton}
          onPress={() => setEditModalVisible(true)}
        >
          <Ionicons name="create-outline" size={18} color="#0F172A" />
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={24} color="#3B82F6" />
          <Text style={styles.statNumber}>
            {bookingHistory.filter(b => b.status === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>Services Done</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="star" size={24} color="#FBBF24" />
          <Text style={styles.statNumber}>
            {bookingHistory.filter(b => b.customer_rating).length}
          </Text>
          <Text style={styles.statLabel}>Ratings Given</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="location" size={24} color="#10B981" />
          <Text style={styles.statNumber}>{savedLocations.length}</Text>
          <Text style={styles.statLabel}>Saved Places</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity 
          style={styles.actionItem}
          // onPress={() => router.push('/(customer)/saved-locations')}
        >
          <Ionicons name="location-outline" size={22} color="#0F172A" />
          <Text style={styles.actionText}>Manage Saved Locations</Text>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionItem}
          // onPress={() => router.push('/(customer)/payment-methods')}
        >
          <Ionicons name="card-outline" size={22} color="#0F172A" />
          <Text style={styles.actionText}>Payment Methods</Text>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionItem}
          // onPress={() => router.push('/(customer)/support')}
        >
          <Ionicons name="headset-outline" size={22} color="#0F172A" />
          <Text style={styles.actionText}>Support & Help</Text>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <TouchableOpacity style={styles.actionItem} onPress={handleChangePassword}>
          <Ionicons name="key-outline" size={22} color="#0F172A" />
          <Text style={styles.actionText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Logout</Text>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete Account</Text>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderSavedLocations = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F172A"]} />
      }
    >
      {savedLocations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyStateText}>No saved locations</Text>
          <Text style={styles.emptyStateSubtext}>
            Save your favorite places for quick access
          </Text>
          <TouchableOpacity 
            style={styles.bookNowButton}
            // onPress={() => router.push('/(customer)')}
          >
            <Text style={styles.bookNowText}>Add Location</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {savedLocations.map((location) => (
            <View key={location.id} style={styles.locationCard}>
              <View style={styles.locationIcon}>
                <Ionicons 
                  name={location.is_default ? "home" : "location"} 
                  size={24} 
                  color="#0F172A" 
                />
              </View>
              <View style={styles.locationInfo}>
                <View style={styles.locationHeader}>
                  <Text style={styles.locationName}>{location.name}</Text>
                  {location.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {location.address}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.locationAction}
                onPress={() => {
                  Alert.alert(
                    'Location Options',
                    'Choose an action',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Set as Default', onPress: () => {} },
                      { text: 'Delete', style: 'destructive', onPress: () => {} },
                    ]
                  );
                }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity 
            style={styles.addLocationButton}
            // onPress={() => router.push('/(customer)/add-location')}
          >
            <Ionicons name="add" size={24} color="#0F172A" />
            <Text style={styles.addLocationText}>Add New Location</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );

  // Booking Details Modal
  const renderBookingDetailsModal = () => (
    <Modal
      visible={showBookingDetails}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowBookingDetails(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Booking Details</Text>
            <TouchableOpacity onPress={() => setShowBookingDetails(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {selectedBooking && (
              <>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Service</Text>
                  <Text style={styles.detailValue}>{selectedBooking.service?.name}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedBooking.status) + '20', alignSelf: 'flex-start' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedBooking.status) }]}>
                      {selectedBooking.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedBooking.created_at)}</Text>
                </View>

                {selectedBooking.mechanic && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Mechanic</Text>
                    <Text style={styles.detailValue}>{selectedBooking.mechanic.full_name}</Text>
                    {selectedBooking.mechanic.phone && (
                      <Text style={styles.detailSubvalue}>{selectedBooking.mechanic.phone}</Text>
                    )}
                  </View>
                )}

                {selectedBooking.total_amount && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Total Amount</Text>
                    <Text style={styles.detailValue}>₹{selectedBooking.total_amount}</Text>
                  </View>
                )}

                {selectedBooking.customer_rating && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Your Rating</Text>
                    <View style={styles.ratingContainer}>
                      {renderStars(selectedBooking.customer_rating)}
                      {selectedBooking.customer_review && (
                        <Text style={styles.reviewText}>"{selectedBooking.customer_review}"</Text>
                      )}
                    </View>
                  </View>
                )}

                {selectedBooking.mechanic_rating && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Mechanic's Rating</Text>
                    <View style={styles.ratingContainer}>
                      {renderStars(selectedBooking.mechanic_rating)}
                      {selectedBooking.mechanic_review && (
                        <Text style={styles.reviewText}>"{selectedBooking.mechanic_review}"</Text>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => setShowBookingDetails(false)}
          >
            <Text style={styles.closeModalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Edit Profile Modal
  const renderEditProfileModal = () => (
    <Modal
      visible={editModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setEditModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.editModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={editForm.full_name}
                onChangeText={(text) => setEditForm({ ...editForm, full_name: text })}
                placeholder="Enter your full name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={profile?.email || user?.email}
                editable={false}
              />
              <Text style={styles.inputHint}>Email cannot be changed</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, updating && styles.disabledButton]}
              onPress={handleUpdateProfile}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {/* <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons 
            name="person-outline" 
            size={20} 
            color={activeTab === 'overview' ? '#0F172A' : '#64748B'} 
          />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity> */}
        {/* <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons 
            name="time-outline" 
            size={20} 
            color={activeTab === 'history' ? '#0F172A' : '#64748B'} 
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'locations' && styles.activeTab]}
          onPress={() => setActiveTab('locations')}
        >
          <Ionicons 
            name="location-outline" 
            size={20} 
            color={activeTab === 'locations' ? '#0F172A' : '#64748B'} 
          />
          <Text style={[styles.tabText, activeTab === 'locations' && styles.activeTabText]}>
            Locations
          </Text>
        </TouchableOpacity> */}
      </View>

      {activeTab === 'overview' && renderOverview()}
      {/* {activeTab === 'history' && renderBookingHistory()}
      {activeTab === 'locations' && renderSavedLocations()} */}

      {renderEditProfileModal()}
      {renderBookingDetailsModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0F172A',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#0F172A',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFF',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0F172A',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#64748B',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFF',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    marginLeft: 12,
  },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingService: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 12,
    color: '#64748B',
  },
  bookingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bookingStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bookingMechanic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  bookingMechanicText: {
    fontSize: 13,
    color: '#475569',
  },
  bookingRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  bookingReview: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  rateButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  rateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  defaultBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  locationAddress: {
    fontSize: 13,
    color: '#64748B',
  },
  locationAction: {
    padding: 8,
  },
  addLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  addLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  bookNowButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  bookNowText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  editModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  detailSubvalue: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  ratingContainer: {
    gap: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 8,
  },
  closeModalButton: {
    margin: 20,
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 12,
  },
  closeModalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  editForm: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#0F172A',
  },
  disabledInput: {
    backgroundColor: '#F8FAFC',
    color: '#94A3B8',
  },
  inputHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
});