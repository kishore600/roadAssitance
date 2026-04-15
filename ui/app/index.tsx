import { router } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

export default function Index() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect based on role
      if (user.role === 'mechanic') {
        router.replace('/mechanic/dashboard');
      } else {
        router.replace('/(tabs)/customer');
      }
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      </SafeAreaView>
    );
  }

  if (user) {
    return null; // Will redirect in useEffect
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Roadside Rescue</Text>
        <Text style={styles.subtitle}>24/7 Roadside Assistance at Your Fingertips</Text>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 36, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#475569', textAlign: 'center', marginBottom: 32 },
  button: { backgroundColor: '#0F172A', padding: 16, borderRadius: 14 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  secondaryButton: { backgroundColor: '#E2E8F0', padding: 16, borderRadius: 14 },
  secondaryButtonText: { color: '#0F172A', fontSize: 16, fontWeight: '700', textAlign: 'center' }
});