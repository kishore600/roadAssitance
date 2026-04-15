import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface MechanicMapProps {
  onMechanicSelect?: (mechanic: any) => void;
  radiusKm?: number;
}

export function MechanicMap({ onMechanicSelect, radiusKm = 10 }: MechanicMapProps) {
  return (
    <View style={styles.container}>
      <View style={styles.messageContainer}>
        <Text style={styles.emoji}>🗺️</Text>
        <Text style={styles.title}>Map View Unavailable on Web</Text>
        <Text style={styles.message}>
          The map feature is only available on mobile devices (iOS and Android).
        </Text>
        <Text style={styles.subMessage}>
          Please use the mobile app to see nearby mechanics on the map.
        </Text>
        <Text style={styles.note}>
          You can still request roadside assistance from the Customer tab.
        </Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => {
            // Navigate to customer tab
            const event = new CustomEvent('navigate-to-customer');
            window.dispatchEvent(event);
          }}
        >
          <Text style={styles.buttonText}>Go to Customer Tab</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  subMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  note: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});