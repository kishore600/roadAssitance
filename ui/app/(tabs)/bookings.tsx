import { useEffect, useState, useCallback } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View, ActivityIndicator, RefreshControl, Alert, TouchableOpacity, Modal, TextInput } from 'react-native';
import { BookingStatusCard } from '@/components/BookingStatusCard';
import { api } from '@/lib/api';
import { Booking } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [updateNote, setUpdateNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  async function loadBookings() {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data } = await api.get(`/bookings/customer/${user.id}`);
      setBookings(data);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      const { data } = await api.get(`/bookings/customer/${user.id}`);
      setBookings(data);
    } catch (error) {
      console.error('Failed to refresh bookings:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  async function deleteBooking(bookingId: string) {
    Alert.alert(
      'Delete Booking',
      'Are you sure you want to delete this booking? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/bookings/${bookingId}`);
              Alert.alert('Success', 'Booking deleted successfully');
              await loadBookings();
            } catch (error:any) {
              console.error(error);
              console.log(error);
              Alert.alert('Error', error);
            }
          }
        }
      ]
    );
  }

  async function updateBooking() {
    if (!selectedBooking) return;
    
    setUpdating(true);
    try {
      await api.patch(`/bookings/${selectedBooking.id}`, {
        issue_note: updateNote
      });
      Alert.alert('Success', 'Booking updated successfully');
      setModalVisible(false);
      setSelectedBooking(null);
      setUpdateNote('');
      await loadBookings();
    } catch (error) {
      console.error('Failed to update booking:', error);
      Alert.alert('Error', 'Failed to update booking');
    } finally {
      setUpdating(false);
    }
  }

  async function cancelBooking(bookingId: string) {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.patch(`/bookings/${bookingId}/status`, { status: 'cancelled' });
              Alert.alert('Success', 'Booking cancelled successfully');
              await loadBookings();
            } catch (error) {
              console.error('Failed to cancel booking:', error);
              Alert.alert('Error', 'Failed to cancel booking');
            }
          }
        }
      ]
    );
  }

  const openUpdateModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setUpdateNote(booking.issue_note || '');
    setModalVisible(true);
  };

  const renderBookingCard = ({ item }: { item: Booking }) => {
    const isActive = item.status !== 'completed' && item.status !== 'cancelled';
    const isCancellable = item.status === 'requested' || item.status === 'accepted';
    
    return (
      <View style={styles.cardWrapper}>
        <BookingStatusCard booking={item} />
        <View style={styles.actionButtons}>
          {isActive && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.updateButton]}
                onPress={() => openUpdateModal(item)}
              >
                <Ionicons name="create-outline" size={18} color="#2563EB" />
                <Text style={styles.updateButtonText}>Update</Text>
              </TouchableOpacity>
              
              {isCancellable && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => cancelBooking(item.id)}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => deleteBooking(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0F172A']}
            tintColor="#0F172A"
            title="Pull to refresh"
            titleColor="#64748B"
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Your Bookings</Text>
            <Text style={styles.subtitle}>Track, update, or cancel your roadside requests.</Text>
          </View>
        }
        renderItem={renderBookingCard}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyStateText}>No bookings found</Text>
            <Text style={styles.emptyStateSubtext}>Create your first booking from the Customer tab</Text>
          </View>
        }
      />

      {/* Update Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Booking</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.bookingId}>
                Booking #{selectedBooking?.id.slice(0, 8)}
              </Text>
              
              <Text style={styles.label}>Issue Description</Text>
              <TextInput
                style={styles.textArea}
                value={updateNote}
                onChangeText={setUpdateNote}
                placeholder="Describe your issue..."
                multiline
                numberOfLines={4}
                editable={!updating}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => setModalVisible(false)}
                  disabled={updating}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.updateModalButton]}
                  onPress={updateBooking}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.updateModalButtonText}>Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC',marginTop:20 },
  content: { padding: 16, flexGrow: 1 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginTop: 10 },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 6, marginBottom: 18 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  cardWrapper: {
    marginBottom: 16,
  },
  
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  
  updateButton: {
    backgroundColor: '#EFF6FF',
  },
  
  updateButtonText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '600',
  },
  
  cancelButton: {
    backgroundColor: '#FEF2F2',
  },
  
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  
  emptyState: { 
    padding: 32, 
    alignItems: 'center', 
    justifyContent: 'center', 
    flex: 1 
  },
  emptyStateText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#64748B', 
    marginBottom: 8,
    marginTop: 12 
  },
  emptyStateSubtext: { 
    fontSize: 14, 
    color: '#94A3B8', 
    textAlign: 'center' 
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
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
  bookingId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#F1F5F9',
  },
  cancelModalButtonText: {
    color: '#64748B',
    fontWeight: '600',
  },
  updateModalButton: {
    backgroundColor: '#0F172A',
  },
  updateModalButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
});