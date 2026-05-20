/* eslint-disable react/no-string-refs */
import { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, 
  Alert 
} from 'react-native';
import { router, Link } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/lib/api'; 

export default function LoginScreen() {
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { login, user } = useAuth();

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Check if user is already logged in
  useEffect(() => {
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    try {
      const token = await SecureStore.getItemAsync('token');
      const userData = await SecureStore.getItemAsync('user_data');
      console.log('Existing session check:', { token, userData, user });
      if (token && userData && user) {
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

  // Send OTP - 使用 API 类
  async function handleSendOTP() {
    if (!phone) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // Basic phone validation
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone.replace(/[^0-9]/g, ''))) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setOtpLoading(true);
    try {
      const { data } = await api.post('/auth/send-otp', { phone });
      
      if (data.success) {
        setOtpSent(true);
        setCountdown(60);
        Alert.alert('Success', 'OTP sent successfully!');
        if (data.devOtp) {
          Alert.alert('Development OTP', `Your OTP is: ${data.devOtp}`);
        }
      } else {
        Alert.alert('Error', data.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('Send OTP error:', error);
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  }

  // Verify OTP and login - 使用 API 类
  async function handleVerifyOTP() {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      // 使用 api.post 方法
      const { data } = await api.post('/auth/verify-otp', { phone, otp });
      
      if (data.success) {
        // Store token and user data using api methods
        await api.setToken(data.token);
        await api.setUser(data.user);
        
        // Also store in SecureStore for compatibility
        await SecureStore.setItemAsync('token', data.token);
        await SecureStore.setItemAsync('user_data', JSON.stringify(data.user));
        
        // Navigate based on role
        if (data.user.role === 'mechanic') {
          router.replace('/mechanic/dashboard');
        } else {
          router.replace('/(tabs)/customer');
        }
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid OTP');
      }
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      Alert.alert('Error', error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  // Email/Password login - 使用现有的 login 函数（应该已经在使用 API）
  async function handleEmailLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        console.log('Login successful');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Reset OTP flow
  function resetOTPFlow() {
    setOtpSent(false);
    setOtp('');
    setCountdown(0);
  }

  // Format phone number for display
  function formatPhoneNumber(text: string) {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 10) return cleaned;
    return cleaned.slice(0, 15);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>🚗</Text>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to your account</Text>
          </View>

          {/* Login Method Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, loginMethod === 'email' && styles.toggleActive]}
              onPress={() => {
                setLoginMethod('email');
                resetOTPFlow();
              }}
            >
              <Text style={[styles.toggleText, loginMethod === 'email' && styles.toggleTextActive]}>
                Email Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, loginMethod === 'phone' && styles.toggleActive]}
              onPress={() => {
                setLoginMethod('phone');
                resetOTPFlow();
              }}
            >
              <Text style={[styles.toggleText, loginMethod === 'phone' && styles.toggleTextActive]}>
                Phone Login
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {loginMethod === 'email' ? (
              // Email/Password Login Form
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                  returnKeyType="next"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleEmailLogin}
                />

                <TouchableOpacity 
                  style={[styles.button, loading && styles.buttonDisabled]} 
                  onPress={handleEmailLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>Login</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              // Phone OTP Login Form
              <>
                {!otpSent ? (
                  // Phone number input
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Phone Number"
                      placeholderTextColor="#94A3B8"
                      value={phone}
                      onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                      keyboardType="phone-pad"
                      editable={!otpLoading}
                      returnKeyType="done"
                    />
                    
                    <TouchableOpacity 
                      style={[styles.button, otpLoading && styles.buttonDisabled]} 
                      onPress={handleSendOTP}
                      disabled={otpLoading}
                    >
                      {otpLoading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.buttonText}>Send OTP</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  // OTP verification
                  <>
                    <View style={styles.otpHeader}>
                      <Text style={styles.otpText}>
                        OTP sent to {phone} your OTP is ${otp}
                      </Text>
                      <TouchableOpacity onPress={resetOTPFlow}>
                        <Text style={styles.editLink}>Edit</Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="Enter 6-digit OTP"
                      placeholderTextColor="#94A3B8"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!loading}
                      returnKeyType="done"
                      onSubmitEditing={handleVerifyOTP}
                    />

                    <TouchableOpacity 
                      style={[styles.button, loading && styles.buttonDisabled]} 
                      onPress={handleVerifyOTP}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.buttonText}>Verify & Login</Text>
                      )}
                    </TouchableOpacity>

                    {countdown > 0 ? (
                      <Text style={styles.resendText}>
                        Resend OTP in {countdown}s
                      </Text>
                    ) : (
                      <TouchableOpacity onPress={handleSendOTP}>
                        <Text style={styles.resendLink}>Resend OTP</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don&lsquo;t have an account? </Text>
              <Link href="/(auth)/signup" asChild>
                <TouchableOpacity>
                  <Text style={styles.link}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  keyboardView: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B' },
  
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleTextActive: {
    color: '#0F172A',
  },
  
  form: { gap: 16 },
  input: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#0F172A',
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
  
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  otpText: {
    fontSize: 14,
    color: '#64748B',
  },
  editLink: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  resendText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  resendLink: {
    textAlign: 'center',
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 8,
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