import { router } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Home() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Roadside Rescue</Text>
        <Text style={styles.subtitle}>Choose how you want to use the app.</Text>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/(tabs)/customer')}>
          <Text style={styles.buttonText}>Continue as Customer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/mechanic/dashboard')}>
          <Text style={styles.secondaryButtonText}>Continue as Mechanic</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 32, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 16, color: '#475569', marginBottom: 12 },
  button: { backgroundColor: '#0F172A', padding: 16, borderRadius: 14 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  secondaryButton: { backgroundColor: '#E2E8F0', padding: 16, borderRadius: 14 },
  secondaryButtonText: { color: '#0F172A', fontSize: 16, fontWeight: '700', textAlign: 'center' }
});
