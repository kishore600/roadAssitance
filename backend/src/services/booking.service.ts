import { supabaseAdmin } from '../config/supabase';
import { emitBookingUpdate,emitMechanicLocation } from '../socket';

export async function getServices() {
  const { data, error } = await supabaseAdmin.from('services').select('*').order('name');
  if (error) throw error;
  return data;
}
// name chnage 2
export async function getNearbyMechanics(customerLat?: number, customerLng?: number, radiusKm: number = 10) {
  // First get all mechanics
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, mechanic_status(is_online, vehicle_type, current_lat, current_lng)')
    .eq('role', 'mechanic');

  if (error) throw error;

  // Process mechanics data
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

  // Calculate distance if customer location is provided
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
    
    // Filter by radius and sort by distance
    mechanics = mechanics
      .filter(mechanic => mechanic.distance_km! <= radiusKm)
      .sort((a, b) => (a.distance_km || Infinity) - (b.distance_km || Infinity));
  }

  return mechanics;
}

// Helper function to calculate distance between two points (in km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
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
    .select('*')
    .single();

  if (error) throw error;

  emitBookingUpdate(data.id, data);

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
        price
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
        email
      ),
      service:services(
        name, 
        price
      )
    `)
    .eq('status', 'requested')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function assignMechanic(bookingId: string, mechanicId: string, etaMinutes: number) {
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
  const R = 6371; // km
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

export async function cancelBooking(bookingId: string) {
  // First get the current booking
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .single();
  
  if (fetchError) throw fetchError;
  
  // Only allow cancellation of requested or accepted bookings
  if (booking.status !== 'requested' && booking.status !== 'accepted') {
    throw new Error('Only requested or accepted bookings can be cancelled');
  }
  
  // Update status to cancelled
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ 
      status: 'cancelled', 
      updated_at: new Date().toISOString() 
    })
    .eq('id', bookingId)
    .select('*')
    .single();
  
  if (error) throw error;
  emitBookingUpdate(bookingId, data);
  return data;
}

// services/booking.service.js

export async function deleteBooking(bookingId:any) {
  try {
    // First get the current booking
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
    
    // Define which statuses can be deleted
    const deletableStatuses = ['completed', 'cancelled', 'rejected'];
    
    if (!deletableStatuses.includes(booking.status)) {
      throw new Error(`Cannot delete booking with status '${booking.status}'. Only completed, cancelled, or rejected bookings can be deleted.`);
    }
    
    // Delete the booking
    const { error: deleteError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('id', bookingId);
    
    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw new Error(`Failed to delete booking: ${deleteError.message}`);
    }
    
    // Emit deletion event (wrap in try-catch to avoid breaking the main flow)
    try {
      emitBookingUpdate(bookingId, { deleted: true, id: bookingId });
    } catch (emitError) {
      console.warn('Failed to emit deletion event:', emitError);
      // Don't throw, just warn
    }
    
    return { success: true, message: 'Booking deleted successfully' };
    
  } catch (error:any) {
    console.error('Error in deleteBooking function:', error);
    // Re-throw with a clear message
    throw new Error(error.message || 'Failed to delete booking');
  }
}

// Update booking (edit issue_note and other editable fields)
export async function updateBooking(bookingId: string, updateData: { 
  issue_note?: string;
  customer_address?: string;
  updated_at: string;
}) {
  // First get the current booking to check status
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .single();
  
  if (fetchError) throw fetchError;
  
  // Only allow updates for non-completed and non-cancelled bookings
  if (booking.status === 'completed') {
    throw new Error('Cannot update a completed booking');
  }
  
  if (booking.status === 'cancelled') {
    throw new Error('Cannot update a cancelled booking');
  }
  
  // Update the booking
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId)
    .select('*')
    .single();
  
  if (error) throw error;
  
  // Emit update event for real-time updates
  emitBookingUpdate(bookingId, data);
  
  return data;
}

// Add this function if it's missing
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
        price
      )
    `)
    .eq('mechanic_id', mechanicId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}