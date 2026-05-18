// routes/mechanics.routes.js
import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

export const mechanicsRouter = Router();

// Get mechanic profile
mechanicsRouter.get('/:mechanicId/profile', async (req, res) => {
  try {
    const { mechanicId } = req.params;
    
    // Get profile data
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', mechanicId)
      .single();
    
    if (profileError) throw profileError;
    
    // Get mechanic status
    const { data: status, error: statusError } = await supabaseAdmin
      .from('mechanic_status')
      .select('*')
      .eq('profile_id', mechanicId)
      .single();
    
    // Get mechanic services and custom prices
    const { data: mechanicServices, error: servicesError } = await supabaseAdmin
      .from('mechanic_services')
      .select('service_id, custom_price')
      .eq('mechanic_id', mechanicId);
    
    const servicesOffered = mechanicServices?.map((ms: any) => ms.service_id) || [];
    const customPrices:any = {};
    mechanicServices?.forEach((ms: any) => {
      if (ms.custom_price) {
        customPrices[ms.service_id] = ms.custom_price;
      }
    });
    
    // Calculate rating and total jobs
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('customer_rating, status')
      .eq('mechanic_id', mechanicId);
    
    let totalRating = 0;
    let ratingCount = 0;
    let totalJobs = 0;
    let completedJobs = 0;
    
    bookings?.forEach(booking => {
      totalJobs++;
      if (booking.status === 'completed') {
        completedJobs++;
        if (booking.customer_rating) {
          totalRating += booking.customer_rating;
          ratingCount++;
        }
      }
    });
    
    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
    
    res.json({
      ...profile,
      ...status,
      services_offered: servicesOffered,
      custom_prices: customPrices,
      rating: averageRating,
      total_jobs: totalJobs,
      completion_rate: Math.round(completionRate),
      is_verified: status?.is_verified || false
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch mechanic profile' });
  }
});

// Update mechanic profile
mechanicsRouter.put('/:mechanicId/profile', async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const { 
      full_name, 
      phone, 
      vehicle_type, 
      license_number, 
      experience_years,
      bio,
      services_offered,
      custom_prices
    } = req.body;
    
    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name,
        phone
        // updated_at: new Date().toISOString()
      })
      .eq('id', mechanicId);
    
    if (profileError) throw profileError;
    
    // Update mechanic status
    const { error: statusError } = await supabaseAdmin
      .from('mechanic_status')
      .upsert({
        profile_id: mechanicId,
        vehicle_type,
        license_number,
        experience_years,
        bio
        // updated_at: new Date().toISOString()
      }, { onConflict: 'profile_id' });
    
    if (statusError) throw statusError;
    
    // Update mechanic services
    // First, delete existing services
    const { error: deleteError } = await supabaseAdmin
      .from('mechanic_services')
      .delete()
      .eq('mechanic_id', mechanicId);
    
    if (deleteError) throw deleteError;
    
    // Then insert new services
    if (services_offered && services_offered.length > 0) {
      const serviceInserts = services_offered.map((serviceId: string) => ({
        mechanic_id: mechanicId,
        service_id: serviceId,
        custom_price: custom_prices?.[serviceId] || null
      }));
      
      const { error: insertError } = await supabaseAdmin
        .from('mechanic_services')
        .insert(serviceInserts);
      
      if (insertError) throw insertError;
    }
    
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get mechanic analytics
mechanicsRouter.get('/:mechanicId/analytics', async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get weekly earnings
    const { data: weeklyBookings, error: weeklyError } = await supabaseAdmin
      .from('bookings')
      .select('service_price')
      .eq('mechanic_id', mechanicId)
      .eq('status', 'completed')
      .gte('completed_at', weekAgo.toISOString());
    
    const weeklyEarnings = weeklyBookings?.reduce((sum, b) => sum + (b.service_price || 0), 0) || 0;
    
    // Get monthly earnings
    const { data: monthlyBookings, error: monthlyError } = await supabaseAdmin
      .from('bookings')
      .select('service_price')
      .eq('mechanic_id', mechanicId)
      .eq('status', 'completed')
      .gte('completed_at', monthAgo.toISOString());
    
    const monthlyEarnings = monthlyBookings?.reduce((sum, b) => sum + (b.service_price || 0), 0) || 0;
    
    // Get total completed jobs
    const { count: totalJobs, error: totalError } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('mechanic_id', mechanicId)
      .eq('status', 'completed');
    
    // Get service-wise statistics
    const { data: serviceStats, error: statsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        service_id,
        services(name),
        service_price,
        customer_rating
      `)
      .eq('mechanic_id', mechanicId)
      .eq('status', 'completed');
    
    const serviceStatsMap = new Map();
    serviceStats?.forEach((booking: any) => {
      const serviceId = booking.service_id;
      if (!serviceStatsMap.has(serviceId)) {
        serviceStatsMap.set(serviceId, {
          service_id: serviceId,
          service_name: booking.services?.name || 'Unknown',
          total_completed: 0,
          total_earnings: 0,
          total_rating: 0,
          rating_count: 0
        });
      }
      
      const stat = serviceStatsMap.get(serviceId);
      stat.total_completed++;
      stat.total_earnings += booking.service_price || 0;
      if (booking.customer_rating) {
        stat.total_rating += booking.customer_rating;
        stat.rating_count++;
      }
    });
    
    const serviceStatsArray = Array.from(serviceStatsMap.values()).map(stat => ({
      ...stat,
      avg_rating: stat.rating_count > 0 ? stat.total_rating / stat.rating_count : 0
    }));
    
    res.json({
      weekly_earnings: weeklyEarnings,
      monthly_earnings: monthlyEarnings,
      total_jobs: totalJobs || 0,
      service_stats: serviceStatsArray
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});