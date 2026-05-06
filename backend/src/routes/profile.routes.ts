import express from 'express';
import { supabaseAdmin } from '../config/supabase';
import bcrypt from 'bcrypt';

const router = express.Router();

// Get current user profile (from token)
router.get('/me', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    console.log(userId)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, phone, role')
      .eq('id', userId)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get profile by ID (with authorization check)
router.get('/:id', async (req: any, res) => {
  try {
    const userId = req.params.id;
    const currentUser = req.user;

    // Check if user is accessing their own profile
    if (currentUser?.id !== userId && currentUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, phone, created_at')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.patch('/:id', async (req: any, res) => {
  const { full_name, phone } = req.body;
  const userId = req.params.id;
  const currentUser = req.user;

  // Check if user is updating their own profile
  if (currentUser?.id !== userId && currentUser?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ 
        full_name, 
        phone, 
      })
      .eq('id', userId)
      .select('id, email, full_name, phone, created_at')
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.log(error)
    res.status(500).json({ error: error.message });
  }
});

// Change password
router.post('/change-password', async (req: any, res) => {
  try {
    console.log(req.user)
    const userId = req.user?.id;
    const { current_password, new_password } = req.body;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get user with current password
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('password')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        password: hashedPassword,
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user stats
router.get('/:id/stats', async (req: any, res) => {
  try {
    const userId = req.params.id;
    const currentUser = req.user;

    if (currentUser?.id !== userId && currentUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get completed services count
    const { count: completedServices, error: servicesError } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', userId)
      .eq('status', 'completed');

    if (servicesError) throw servicesError;

    // Get ratings given count
    const { count: ratingsGiven, error: ratingsError } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', userId)
      .not('customer_rating', 'is', null);

    if (ratingsError) throw ratingsError;

    // Get saved locations count
    const { count: savedLocations, error: locationsError } = await supabaseAdmin
      .from('saved_locations')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', userId);

    if (locationsError) throw locationsError;

    res.json({
      totalServicesDone: completedServices || 0,
      totalRatingsGiven: ratingsGiven || 0,
      totalSavedLocations: savedLocations || 0,
    });
  } catch (error: any) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete account
router.delete('/:id', async (req: any, res) => {
  const userId = req.params.id;
  const currentUser = req.user;

  if (currentUser?.id !== userId && currentUser?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Delete saved locations first
    const { error: locationsError } = await supabaseAdmin
      .from('saved_locations')
      .delete()
      .eq('customer_id', userId);

    if (locationsError) {
      console.error('Error deleting locations:', locationsError);
    }

    // Delete bookings
    const { error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('customer_id', userId);

    if (bookingsError) {
      console.error('Error deleting bookings:', bookingsError);
    }

    // Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) throw profileError;
    
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;