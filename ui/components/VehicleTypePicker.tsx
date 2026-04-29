// components/VehicleTypePicker.tsx
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface VehicleType {
  id: string;
  name: string;
  category: '2-wheeler' | '3-wheeler' | '4-wheeler';
  size: 'small' | 'medium' | 'large';
  examples?: string[];
}

interface VehicleTypePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (vehicleType: VehicleType) => void;
  selectedVehicle?: VehicleType | null;
}

const VEHICLE_CATEGORIES = [
  { id: '2-wheeler', name: 'Two Wheelers', icon: 'bicycle' as const },
  { id: '3-wheeler', name: 'Three Wheelers', icon: 'car-sport' as const },
  { id: '4-wheeler', name: 'Four Wheelers', icon: 'car' as const },
];

const VEHICLE_TYPES: VehicleType[] = [
  // 2-Wheelers
  { id: 'motorcycle', name: 'Motorcycle/Scooter', category: '2-wheeler', size: 'small', examples: ['Activa', 'Pulsar', 'Scooty'] },
  { id: 'bike', name: 'Bike', category: '2-wheeler', size: 'small', examples: ['Royal Enfield', 'KTM', 'Duke'] },
  
  // 3-Wheelers
  { id: 'auto', name: 'Auto-rickshaw', category: '3-wheeler', size: 'medium', examples: ['Bajaj Auto', 'Piaggio'] },
  
  // 4-Wheelers
  { id: 'hatchback', name: 'Hatchback', category: '4-wheeler', size: 'small', examples: ['Maruti Swift', 'Hyundai i10', 'Tata Punch'] },
  { id: 'sedan', name: 'Sedan', category: '4-wheeler', size: 'medium', examples: ['Honda City', 'Hyundai Verna', 'Maruti Ciaz'] },
  { id: 'suv', name: 'SUV/MPV', category: '4-wheeler', size: 'large', examples: ['Hyundai Creta', 'MG Hector', 'Toyota Innova'] },
  { id: 'luxury', name: 'Luxury Car', category: '4-wheeler', size: 'large', examples: ['BMW', 'Mercedes', 'Audi'] },
];

export function VehicleTypePicker({ visible, onClose, onSelect, selectedVehicle }: VehicleTypePickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('2-wheeler');

  const filteredVehicles = VEHICLE_TYPES.filter(v => v.category === selectedCategory);

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case '2-wheeler': return 'bicycle';
      case '3-wheeler': return 'car-sport';
      case '4-wheeler': return 'car';
      default: return 'car';
    }
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

          {/* Category Tabs */}
          <View style={styles.categoryTabs}>
            {VEHICLE_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryTab,
                  selectedCategory === category.id && styles.activeCategoryTab,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Ionicons
                  name={category.icon}
                  size={20}
                  color={selectedCategory === category.id ? '#0F172A' : '#64748B'}
                />
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === category.id && styles.activeCategoryTabText,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.vehicleList}>
            {filteredVehicles.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.vehicleItem,
                  selectedVehicle?.id === vehicle.id && styles.selectedVehicleItem,
                ]}
                onPress={() => {
                  onSelect(vehicle);
                  onClose();
                }}
              >
                <View style={styles.vehicleInfo}>
                  <View style={styles.vehicleIconContainer}>
                    <Ionicons
                      name={getVehicleIcon(vehicle.id)}
                      size={32}
                      color="#0F172A"
                    />
                  </View>
                  <View style={styles.vehicleDetails}>
                    <Text style={styles.vehicleName}>{vehicle.name}</Text>
                    {vehicle.examples && vehicle.examples.length > 0 && (
                      <Text style={styles.vehicleExamples}>
                        e.g., {vehicle.examples.slice(0, 3).join(', ')}
                      </Text>
                    )}
                    <View style={styles.vehicleBadges}>
                      <View style={styles.vehicleBadge}>
                        <Text style={styles.vehicleBadgeText}>
                          {vehicle.size.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                {selectedVehicle?.id === vehicle.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function getVehicleIcon(vehicleId: string): keyof typeof Ionicons.glyphMap {
  switch (vehicleId) {
    case 'motorcycle':
    case 'bike':
      return 'bicycle';
    case 'auto':
      return 'car-sport';
    case 'hatchback':
    case 'sedan':
    case 'suv':
      return 'car';
    case 'luxury':
      return 'car-outline';
    default:
      return 'car';
  }
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    // backgroundColor: 'rgba(0,0,0,0.5)',
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
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  categoryTabs: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  activeCategoryTab: {
    backgroundColor: '#E2E8F0',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  activeCategoryTabText: {
    color: '#0F172A',
    fontWeight: '600',
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
    width: 50,
    height: 50,
    borderRadius: 25,
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
    marginBottom: 4,
  },
  vehicleExamples: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  vehicleBadges: {
    flexDirection: 'row',
    gap: 8,
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
});