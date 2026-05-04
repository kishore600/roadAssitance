// components/VehicleTypePicker.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';

export interface VehicleType {
  id: number;  // Changed to number to match database
  name: string;
  category: string;
  display_order: number;
}

interface VehicleTypePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (vehicleType: VehicleType) => void;
  selectedVehicle?: VehicleType | null;
}

// Category icons mapping
const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  switch (category?.toLowerCase()) {
    case 'two-wheeler':
      return 'bicycle';
    case 'auto':
      return 'car-sport';
    case 'four-wheeler':
      return 'car';
    case 'commercial':
      return 'bus';
    case 'heavy':
      return 'bus';
    default:
      return 'car';
  }
};

// Get example vehicles based on category
const getExampleVehicles = (category: string): string[] => {
  switch (category?.toLowerCase()) {
    case 'two-wheeler':
      return ['Activa', 'Pulsar', 'Scooty'];
    case 'auto':
      return ['Bajaj Auto', 'Piaggio'];
    case 'four-wheeler':
      return ['Maruti Swift', 'Hyundai i10', 'Tata Punch'];
    case 'commercial':
      return ['Tata Ace', 'Mahindra Bolero'];
    case 'heavy':
      return ['Tata Truck', 'Ashok Leyland'];
    default:
      return [];
  }
};

// Get size based on category
const getVehicleSize = (category: string): string => {
  switch (category?.toLowerCase()) {
    case 'two-wheeler':
      return 'Small';
    case 'auto':
      return 'Medium';
    case 'four-wheeler':
      return 'Medium';
    case 'commercial':
      return 'Large';
    case 'heavy':
      return 'Extra Large';
    default:
      return 'Medium';
  }
};

export function VehicleTypePicker({ 
  visible, 
  onClose, 
  onSelect, 
  selectedVehicle 
}: VehicleTypePickerProps) {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch vehicle types from API
  useEffect(() => {
    if (visible) {
      fetchVehicleTypes();
    }
  }, [visible]);

  const fetchVehicleTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/services/vehicle-types');
      console.log('Fetched vehicle types:', data);
      
      // Ensure IDs are numbers
      const normalizedData = data.map((vt: any) => ({
        id: Number(vt.id),
        name: vt.name,
        category: vt.category,
        display_order: vt.display_order
      }));
      
      setVehicleTypes(normalizedData);
    } catch (error) {
      console.error('Failed to fetch vehicle types:', error);
      setError('Failed to load vehicle types');
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories from vehicle types
  const categories = ['all', ...new Set(vehicleTypes.map(vt => vt.category))];

  // Filter vehicle types by selected category
  const filteredVehicles = selectedCategory === 'all'
    ? vehicleTypes
    : vehicleTypes.filter(vt => vt.category === selectedCategory);

  // Sort by display_order
  const sortedVehicles = [...filteredVehicles].sort((a, b) => a.display_order - b.display_order);

  const handleSelect = (vehicle: VehicleType) => {
    console.log('Selected vehicle:', vehicle);
    onSelect(vehicle);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Vehicle Type</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {loading && (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#0F172A" />
              <Text style={styles.loadingText}>Loading vehicle types...</Text>
            </View>
          )}

          {/* Error State */}
          {error && !loading && (
            <View style={styles.centerContent}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchVehicleTypes}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Category Tabs */}
          {!loading && !error && vehicleTypes.length > 0 && (
            <>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categoryTabsContainer}
                contentContainerStyle={styles.categoryTabsContent}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryTab,
                      selectedCategory === category && styles.activeCategoryTab,
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Ionicons
                      name={category === 'all' ? 'apps' : getCategoryIcon(category)}
                      size={18}
                      color={selectedCategory === category ? '#0F172A' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.categoryTabText,
                        selectedCategory === category && styles.activeCategoryTabText,
                      ]}
                    >
                      {category === 'all' ? 'All' : category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Vehicle List */}
              <ScrollView style={styles.vehicleList}>
                {sortedVehicles.map((vehicle) => (
                  <TouchableOpacity
                    key={vehicle.id}
                    style={[
                      styles.vehicleItem,
                      selectedVehicle?.id === vehicle.id && styles.selectedVehicleItem,
                    ]}
                    onPress={() => handleSelect(vehicle)}
                  >
                    <View style={styles.vehicleInfo}>
                      <View style={styles.vehicleIconContainer}>
                        <Ionicons
                          name={getCategoryIcon(vehicle.category)}
                          size={32}
                          color="#0F172A"
                        />
                      </View>
                      <View style={styles.vehicleDetails}>
                        <Text style={styles.vehicleName}>{vehicle.name}</Text>
                        <View style={styles.vehicleMeta}>
                          <View style={styles.vehicleBadge}>
                            <Text style={styles.vehicleBadgeText}>
                              {getVehicleSize(vehicle.category)}
                            </Text>
                          </View>
                          <Text style={styles.vehicleCategory}>
                            {vehicle.category}
                          </Text>
                        </View>
                        <View style={styles.exampleContainer}>
                          {getExampleVehicles(vehicle.category).slice(0, 2).map((example, idx) => (
                            <Text key={idx} style={styles.exampleText}>
                              {example}{idx === 0 ? ', ' : ''}
                            </Text>
                          ))}
                          <Text style={styles.exampleText}>etc.</Text>
                        </View>
                      </View>
                    </View>
                    {selectedVehicle?.id === vehicle.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Empty State */}
          {!loading && !error && vehicleTypes.length === 0 && (
            <View style={styles.centerContent}>
              <Ionicons name="car-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>No vehicle types available</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    // borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  centerContent: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
  },
  categoryTabsContainer: {
    // borderBottomWidth: 1,
    // borderBottomColor: '#E2E8F0',
  },
  categoryTabsContent: {
    // paddingHorizontal: 12,
    // paddingVertical: 12,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  activeCategoryTab: {
    backgroundColor: '#0F172A',
  },
  categoryTabText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  activeCategoryTabText: {
    color: '#FFF',
  },
  vehicleList: {
    padding: 16,
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedVehicleItem: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  vehicleIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
  },
  vehicleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  vehicleBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vehicleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  vehicleCategory: {
    fontSize: 11,
    color: '#64748B',
  },
  exampleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  exampleText: {
    fontSize: 11,
    color: '#94A3B8',
  },
});