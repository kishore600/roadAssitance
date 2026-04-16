// services/booking.service.ts

import { supabaseAdmin } from '../config/supabase';
import { emitBookingUpdate, emitMechanicLocation, emitNewBooking } from '../socket'; // Add emitNewBooking import

// Store active timers
const activeBookingTimers = new Map<string, NodeJS.Timeout>();

export async function getServices() {
  const { data, error } = await supabaseAdmin.from('services').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function getNearbyMechanics(customerLat?: number, customerLng?: number, radiusKm: number = 10) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, mechanic_status(is_online, vehicle_type, current_lat, current_lng)')
    .eq('role', 'mechanic');

  if (error) throw error;

  let mechanics = (data || [])
    .map((item: any) => ({
      id: item.id,
      full_name: item.full_name,
      is_online: item.mechanic_status?.is_online ?? false,
      vehicle_type: item.mechanic_status?.vehicle_type,
      current_lat: item.mechanic_status?.current_lat,
      current_lng: item.mechanic_status?.current_lng,
      distance_km: null as number | null
    }))
    .filter((item) => item.is_online && item.current_lat && item.current_lng);

  if (customerLat && customerLng && mechanics.length > 0) {
    mechanics = mechanics.map(mechanic => {
      const distance = calculateDistance(
        customerLat, 
        customerLng, 
        mechanic.current_lat!, 
        mechanic.current_lng!
      );
      return {
        ...mechanic,
        distance_km: distance
      };
    });
    
    mechanics = mechanics
      .filter(mechanic => mechanic.distance_km! <= radiusKm)
      .sort((a, b) => (a.distance_km || Infinity) - (b.distance_km || Infinity));
  }

  return mechanics;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function createBooking(payload: any) {
  payload.status = 'requested';
  payload.mechanic_id = null;

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .insert(payload)
    .select(`
      *,
      customer:profiles!bookings_customer_id_fkey(
        full_name,
        email,
        phone
      ),
      service:services(
        id,
        name,
        base_price
      )
    `)
    .single();

  if (error) throw error;

  // Start auto-cancellation timer
  startAutoCancelTimer(data.id);

  // Emit to customer who created the booking
  emitBookingUpdate(data.id, data);
  
  // IMPORTANT: Emit to all mechanics for new booking
  emitNewBooking(data);

  return data;
}

function startAutoCancelTimer(bookingId: string) {
  if (activeBookingTimers.has(bookingId)) {
    clearTimeout(activeBookingTimers.get(bookingId));
  }

  const timer = setTimeout(async () => {
    await autoCancelBooking(bookingId);
  }, 120000);

  activeBookingTimers.set(bookingId, timer);
  
  console.log(`⏰ Auto-cancel timer started for booking ${bookingId} (2 minutes)`);
}

async function autoCancelBooking(bookingId: string) {
  try {
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('status')
      .eq('id', bookingId)
      .single();

    if (fetchError) {
      console.error(`Error fetching booking ${bookingId}:`, fetchError);
      return;
    }

    if (booking && booking.status === 'requested') {
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .update({ 
          status: 'cancelled', 
          updated_at: new Date().toISOString(),
          cancellation_reason: 'auto_cancelled_no_mechanic'
        })
        .eq('id', bookingId)
        .select('*')
        .single();

      if (error) {
        console.error(`Error auto-cancelling booking ${bookingId}:`, error);
        return;
      }

      console.log(`⏰ Auto-cancelled booking ${bookingId} - No mechanic accepted within 30 seconds`);
      
      emitBookingUpdate(bookingId, {
        ...data,
        auto_cancelled: true,
        reason: 'No mechanic accepted your request within 30 seconds'
      });
      
      // Emit to mechanics that booking is cancelled
      emitNewBooking({ ...data, status: 'cancelled', auto_cancelled: true });
    }
  } catch (error) {
    console.error(`Auto-cancel failed for booking ${bookingId}:`, error);
  } finally {
    activeBookingTimers.delete(bookingId);
  }
}

export async function cancelAutoCancelTimer(bookingId: string) {
  if (activeBookingTimers.has(bookingId)) {
    clearTimeout(activeBookingTimers.get(bookingId));
    activeBookingTimers.delete(bookingId);
    console.log(`✅ Auto-cancel timer cancelled for booking ${bookingId}`);
  }
}

export async function assignMechanic(bookingId: string, mechanicId: string, etaMinutes: number) {
  await cancelAutoCancelTimer(bookingId);

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ 
      mechanic_id: mechanicId, 
      status: 'accepted', 
      eta_minutes: etaMinutes, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', bookingId)
    .select(`
      *,
      customer:profiles!bookings_customer_id_fkey(
        full_name, 
        email,
        phone
      ),
      mechanic:profiles!bookings_mechanic_id_fkey(
        full_name, 
        email,
        phone
      ),
      service:services(
        id,
        name,
        base_price
      )
    `)
    .single();
  
  if (error) throw error;
  emitBookingUpdate(bookingId, data);
  return data;
}

export async function getBookingById(bookingId: string) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      customer:profiles!bookings_customer_id_fkey(
        full_name, 
        email
      ),
      mechanic:profiles!bookings_mechanic_id_fkey(
        full_name, 
        email
      )
    `)
    .eq('id', bookingId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getMechanicCurrentBooking(mechanicId: string) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('mechanic_id', mechanicId)
    .in('status', ['accepted', 'on_the_way', 'arrived'])
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getCustomerBookings(customerId: string) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      mechanic:profiles!bookings_mechanic_id_fkey(
        full_name, 
        email
      ),
      service:services(
        name, 
        base_price
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getOpenBookings() {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      customer:profiles!bookings_customer_id_fkey(
        full_name, 
        email,
        phone
      ),
      service:services(
        id,
        name, 
        base_price
      )
    `)
    .eq('status', 'requested')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select(`
      *,
      customer:profiles!bookings_customer_id_fkey(
        full_name, 
        email
      ),
      mechanic:profiles!bookings_mechanic_id_fkey(
        full_name, 
        email
      )
    `)
    .single();
  if (error) throw error;
  emitBookingUpdate(bookingId, data);
  return data;
}

export async function updateMechanicAvailability(mechanicId: string, data: { isOnline: boolean; currentLat?: number; currentLng?: number }) {
  console.log(data)
  const payload = {
    profile_id: mechanicId,
    is_online: data.isOnline,
    current_lat: data.currentLat,
    current_lng: data.currentLng,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseAdmin.from('mechanic_status').upsert(payload, { onConflict: 'profile_id' });
  if (error) throw error;
  return payload;
}

export async function updateMechanicLocation(mechanicId: string, lat: number, lng: number) {
  const payload = {
    profile_id: mechanicId,
    current_lat: lat,
    current_lng: lng
  };

  const { error } = await supabaseAdmin
    .from('mechanic_status')
    .upsert(payload, { onConflict: 'profile_id' });

  if (error) throw error;

  emitMechanicLocation(payload);

  return payload;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function findNearestMechanic(lat: number, lng: number) {
  const { data, error } = await supabaseAdmin
    .from('mechanic_status')
    .select('profile_id, current_lat, current_lng, is_online')
    .eq('is_online', true);

  if (error) throw error;

  let nearest = null;
  let minDistance = Infinity;

  for (const mech of data || []) {
    if (!mech.current_lat || !mech.current_lng) continue;

    const dist = getDistance(lat, lng, mech.current_lat, mech.current_lng);

    if (dist < 5 && dist < minDistance) {
      minDistance = dist;
      nearest = mech;
    }
  }

  return nearest;
}

export async function cancelBooking(bookingId: string, reason?: string) {
  await cancelAutoCancelTimer(bookingId);

  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .single();
  
  if (fetchError) throw fetchError;
  
  if (booking.status !== 'requested' && booking.status !== 'accepted') {
    throw new Error('Only requested or accepted bookings can be cancelled');
  }
  
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ 
      status: 'cancelled', 
      updated_at: new Date().toISOString(),
      cancellation_reason: reason || 'user_cancelled'
    })
    .eq('id', bookingId)
    .select('*')
    .single();
  
  if (error) throw error;
  emitBookingUpdate(bookingId, data);
  return data;
}

export async function deleteBooking(bookingId: any) {
  try {
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('status')
      .eq('id', bookingId)
      .single();
    
    if (fetchError) {
      console.error('Fetch error in deleteBooking:', fetchError);
      throw new Error(`Booking not found: ${fetchError.message}`);
    }
    
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    console.log('Deleting booking with status:', booking.status);
    
    const deletableStatuses = ['completed', 'cancelled', 'rejected'];
    
    if (!deletableStatuses.includes(booking.status)) {
      throw new Error(`Cannot delete booking with status '${booking.status}'. Only completed, cancelled, or rejected bookings can be deleted.`);
    }
    
    const { error: deleteError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('id', bookingId);
    
    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw new Error(`Failed to delete booking: ${deleteError.message}`);
    }
    
    try {
      emitBookingUpdate(bookingId, { deleted: true, id: bookingId });
    } catch (emitError) {
      console.warn('Failed to emit deletion event:', emitError);
    }
    
    return { success: true, message: 'Booking deleted successfully' };
    
  } catch (error: any) {
    console.error('Error in deleteBooking function:', error);
    throw new Error(error.message || 'Failed to delete booking');
  }
}

export async function updateBooking(bookingId: string, updateData: { 
  issue_note?: string;
  customer_address?: string;
  updated_at: string;
}) {
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .single();
  
  if (fetchError) throw fetchError;
  
  if (booking.status === 'completed') {
    throw new Error('Cannot update a completed booking');
  }
  
  if (booking.status === 'cancelled') {
    throw new Error('Cannot update a cancelled booking');
  }
  
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId)
    .select('*')
    .single();
  
  if (error) throw error;
  
  emitBookingUpdate(bookingId, data);
  
  return data;
}

export async function getMechanicBookings(mechanicId: any) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      customer:profiles!bookings_customer_id_fkey(
        full_name, 
        email
      ),
      service:services(
        name, 
        base_price
      )
    `)
    .eq('mechanic_id', mechanicId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function cleanupExpiredBookings() {
  console.log('🧹 Cleaning up expired bookings...');
  
  const twoMins_ago = new Date(Date.now() - 120000).toISOString();
  
  const { data: expiredBookings, error } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('status', 'requested')
    .lt('created_at', twoMins_ago);

  if (error) {
    console.error('Error fetching expired bookings:', error);
    return;
  }

  for (const booking of expiredBookings || []) {
    await autoCancelBooking(booking.id);
  }
  
  console.log(`✅ Cleaned up ${expiredBookings?.length || 0} expired bookings`);
}