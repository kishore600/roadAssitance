import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { router, Link } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import * as SecureStore from 'expo-secure-store';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'customer' | 'mechanic'>('customer');
  const [loading, setLoading] = useState(false);
  const { signup,user } = useAuth();

    useEffect(() => {
      checkExistingSession();
    }, [user]);
    
    async function checkExistingSession() {
      try {
        const token = await SecureStore.getItemAsync('token');
        const userData = await SecureStore.getItemAsync('user_data');
        console.log('Existing session check:', { token, userData, user });
        if (token && userData && user) {
          // User already logged in, redirect to appropriate screen
          if (user.role === 'mechanic') {
            router.replace('/mechanic/dashboard');
          } else {
            router.replace('/(tabs)/customer');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    }
  async function handleSignup() {
    if (!email || !password || !fullName) {
      alert('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signup({ email, password, fullName, role, phone });
    } catch (error) {
      // Error handled in auth context
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Full Name *"
                value={fullName}
                onChangeText={setFullName}
                editable={!loading}
              />

              <TextInput
                style={styles.input}
                placeholder="Email *"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />

              <TextInput
                style={styles.input}
                placeholder="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!loading}
              />

              <TextInput
                style={styles.input}
                placeholder="Password *"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />

              <View style={styles.roleContainer}>
                <Text style={styles.roleLabel}>I am a:</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[styles.roleButton, role === 'customer' && styles.roleButtonActive]}
                    onPress={() => setRole('customer')}
                    disabled={loading}
                  >
                    <Text style={[styles.roleText, role === 'customer' && styles.roleTextActive]}>
                      Customer
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleButton, role === 'mechanic' && styles.roleButtonActive]}
                    onPress={() => setRole('mechanic')}
                    disabled={loading}
                  >
                    <Text style={[styles.roleText, role === 'mechanic' && styles.roleTextActive]}>
                      Mechanic
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]} 
                onPress={handleSignup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Sign Up</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.link}>Login</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 32 },
  form: { gap: 16 },
  input: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleContainer: {
    gap: 8,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  roleTextActive: {
    color: '#FFF',
  },
  button: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#64748B',
    fontSize: 14,
  },
  link: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
});