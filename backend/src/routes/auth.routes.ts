// Add these dependencies
// npm install twilio or use a different SMS service

import { Router } from 'express';
import bcrypt from 'bcrypt';
import { supabaseAdmin } from '../config/supabase';
import { signToken } from '../utils/jwt';

// Store OTPs temporarily (use Redis in production)
const otpStore = new Map();

export const authRouter = Router();

// Generate and send OTP
authRouter.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Check if user exists
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, phone')
      .eq('phone', `+91${phone}`)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Phone number not registered' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with expiration (5 minutes)
    otpStore.set(phone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      userId: user.id
    });

    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`OTP for ${phone}: ${otp}`); // For testing
    
    // Example with Twilio (uncomment if using Twilio)
    /*
    const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: `Your verification code is: ${otp}`,
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER
    });
    */

    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      // Remove in production
      devOtp: otp 
    });

  } catch (err: any) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: err.message || 'Failed to send OTP' });
  }
});

// Verify OTP and login
authRouter.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    const storedData = otpStore.get(phone);
    
    if (!storedData) {
      return res.status(400).json({ error: 'OTP expired or not requested' });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Get user data
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, phone')
      .eq('phone', `+91${phone}`)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clear OTP after successful verification
    otpStore.delete(phone);

    const token = signToken({ id: user.id, role: user.role });

    // Set cookie with token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ 
      success: true,
      token,
      user 
    });

  } catch (err: any) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: err.message || 'OTP verification failed' });
  }
});

// Existing email/password login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, phone, password')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, data.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({ id: data.id, role: data.role });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    const { password: _, ...userWithoutPassword } = data;
    
    res.json({ 
      success: true,
      token,
      user: userWithoutPassword 
    });

  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Signup with phone
authRouter.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName, role, phone } = req.body;

    // Check if phone already exists
    const { data: existingPhone } = await supabaseAdmin
      .from('profiles')
      .select('phone')
      .eq('phone', phone)
      .single();

    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        email,
        password: hashed,
        full_name: fullName,
        role,
        phone 
      })
      .select('id, email, full_name, role, phone')
      .single();

    if (error) {
      console.error('Signup DB error:', error);
      return res.status(400).json({ error: error.message });
    }

    const token = signToken({ id: data.id, role: data.role });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ 
      success: true,
      token,
      user: data 
    });

  } catch (err: any) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message || 'Signup failed' });
  }
});

authRouter.post('/logout', async (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});