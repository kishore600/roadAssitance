import { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { MechanicMap } from '@/components/MechanicMap';
import { Mechanic } from '@/types';
import { router } from 'expo-router';

export default function ExploreScreen() {
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleMechanicSelect = (mechanic: Mechanic) => {
    setSelectedMechanic(mechanic);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Mechanics</Text>
        <Text style={styles.subtitle}>Find mechanics available near you</Text>
      </View>

      <MechanicMap onMechanicSelect={handleMechanicSelect} />

      {/* Mechanic Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mechanic Details</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalClose}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedMechanic && (
              <View style={styles.modalBody}>
                <Text style={styles.mechanicName}>{selectedMechanic.full_name}</Text>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Status:</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      selectedMechanic.is_online
                        ? styles.onlineText
                        : styles.offlineText,
                    ]}
                  >
                    {selectedMechanic.is_online ? '🟢 Online' : '🔴 Offline'}
                  </Text>
                </View>

                {selectedMechanic.vehicle_type && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Vehicle Type:</Text>
                    <Text style={styles.infoValue}>
                      {selectedMechanic.vehicle_type}
                    </Text>
                  </View>
                )}

                {selectedMechanic.current_lat && selectedMechanic.current_lng && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Location:</Text>
                    <Text style={styles.infoValue}>
                      {selectedMechanic.current_lat.toFixed(4)},{' '}
                      {selectedMechanic.current_lng.toFixed(4)}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.bookButton}
                  onPress={() => {
                    setModalVisible(false);
                    router.push({
                      pathname: '/(tabs)/customer',
                      params: { mechanicId: selectedMechanic.id },
                    });
                  }}
                >
                  <Text style={styles.bookButtonText}>Request This Mechanic</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop:20,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
  modalClose: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 20,
    color: '#64748B',
  },
  modalBody: {
    padding: 20,
  },
  mechanicName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  onlineText: {
    color: '#10B981',
    fontWeight: '600',
  },
  offlineText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 12,
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  closeModalButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeModalButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});