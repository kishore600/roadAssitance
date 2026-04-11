import { supabaseAdmin } from '../config/supabase';
import { emitBookingUpdate } from '../socket';

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

export async function createBooking(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from('bookings').insert(payload).select('*').single();
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
