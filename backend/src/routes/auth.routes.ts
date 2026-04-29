import { Router } from 'express';
import bcrypt from 'bcrypt';
import { supabaseAdmin } from '../config/supabase';
import { signToken } from '../utils/jwt';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName, role, phone } = req.body;

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

    // Set cookie with token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

    // Set cookie with token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days,
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

// Logout endpoint to clear cookie
authRouter.post('/logout', async (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});