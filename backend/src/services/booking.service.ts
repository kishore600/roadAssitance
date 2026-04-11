import { supabaseAdmin } from '../config/supabase';
import { emitBookingUpdate,emitMechanicLocation } from '../socket';

export async function getServices() {
  const { data, error } = await supabaseAdmin.from('services').select('*').order('name');
  if (error) throw error;
  return data;
}
// name chnage 2
export async function getNearbyMechanics() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, mechanic_status(is_online, vehicle_type, current_lat, current_lng)')
    .eq('role', 'mechanic');

  if (error) throw error;

  return (data || [])
    .map((item: any) => ({
      id: item.id,
      full_name: item.full_name,
      is_online: item.mechanic_status?.is_online ?? false,
      vehicle_type: item.mechanic_status?.vehicle_type,
      current_lat: item.mechanic_status?.current_lat,
      current_lng: item.mechanic_status?.current_lng
    }))
    .filter((item) => item.is_online);
}

export async function createBooking(payload: any) {
  const nearest = await findNearestMechanic(payload.customer_lat, payload.customer_lng);

  if (nearest) {
    payload.mechanic_id = nearest.profile_id;
    payload.status = 'accepted';
    payload.eta_minutes = 10;
  } else {
    payload.status = 'requested';
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;

  emitBookingUpdate(data.id, data);

  return data;
}

export async function getCustomerBookings(customerId: string) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getOpenBookings() {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('status', 'requested')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function assignMechanic(bookingId: string, mechanicId: string, etaMinutes: number) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ mechanic_id: mechanicId, status: 'accepted', eta_minutes: etaMinutes, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select('*')
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
    .select('*')
    .single();
  if (error) throw error;
  emitBookingUpdate(bookingId, data);
  return data;
}

export async function updateMechanicAvailability(mechanicId: string, data: { isOnline: boolean; currentLat?: number; currentLng?: number }) {
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