// services/mechanic.service.ts

import { supabaseAdmin } from '../config/supabase';
import { emitMechanicLocation } from '../socket';

// Types
export interface Mechanic {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  is_online: boolean;
  vehicle_type: string | null;
  current_lat: number | null;
  current_lng: number | null;
  distance_km: number | null;
}

export interface MechanicStatus {
  profile_id: string;
  is_online: boolean;
  current_lat: number | null;
  current_lng: number | null;
  vehicle_type: string | null;
  updated_at: string;
}

export interface MechanicAvailability {
  is_online: boolean;
  current_lat: number | null;
  current_lng: number | null;
  vehicle_type: string | null;
  updated_at?: string;
}

export interface NearestMechanic {
  mechanic_id: string;
  distance_km: number;
  vehicle_type: string | null;
}

export interface BookingWithCustomer {
  id: string;
  customer_id: string;
  mechanic_id: string;
  service_id: string;
  status: string;
  issue_note: string;
  customer_lat: number;
  customer_lng: number;
  customer_address: string;
  created_at: string;
  updated_at: string;
  customer: {
    full_name: string;
    email: string;
    phone: string;
  };
}

export interface BulkLocationUpdate {
  mechanicId: string;
  lat: number;
  lng: number;
}

export interface BulkUpdateResult {
  success: any[];
  failed: Array<{ mechanicId: string; error: string }>;
}

/**
 * Get nearby mechanics based on customer location
 */
export async function getNearbyMechanics(
  customerLat?: number, 
  customerLng?: number, 
  radiusKm: number = 10
): Promise<Mechanic[]> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id, 
      full_name, 
      email, 
      phone,
      mechanic_status:mechanic_status(*)
    `)
    .eq('role', 'mechanic');

  if (error) throw error;

  let mechanics: Mechanic[] = (data || [])
    .map((item: any) => ({
      id: item.id,
      full_name: item.full_name,
      email: item.email,
      phone: item.phone,
      is_online: item.mechanic_status?.is_online ?? false,
      vehicle_type: item.mechanic_status?.vehicle_type,
      current_lat: item.mechanic_status?.current_lat,
      current_lng: item.mechanic_status?.current_lng,
      distance_km: null
    }))
    .filter((item: Mechanic) => item.is_online && item.current_lat && item.current_lng);

  if (customerLat && customerLng && mechanics.length > 0) {
    mechanics = mechanics.map(mechanic => {
      const distance = calculateDistance(
        customerLat,
        customerLng,
        mechanic.current_lat!,
        mechanic.current_lng!
      );
      return { ...mechanic, distance_km: distance };
    });
    
    mechanics = mechanics
      .filter(mechanic => mechanic.distance_km! <= radiusKm)
      .sort((a, b) => (a.distance_km || Infinity) - (b.distance_km || Infinity));
  }

  return mechanics;
}

/**
 * Update mechanic's online availability and location
 */
export async function updateMechanicAvailability(
  mechanicId: string, 
  data: { isOnline: boolean; currentLat?: number; currentLng?: number }
): Promise<MechanicStatus> {
  const payload: Partial<MechanicStatus> = {
    profile_id: mechanicId,
    is_online: data.isOnline,
    current_lat: data.currentLat,
    current_lng: data.currentLng,
    updated_at: new Date().toISOString()
  };

  const { data: result, error } = await supabaseAdmin
    .from('mechanic_status')
    .upsert(payload, { onConflict: 'profile_id' })
    .select()
    .single();

  if (error) throw error;
  
  // Emit socket event for availability change
  if (result && result.is_online) {
    // Notify customers that this mechanic is now online
    // You can implement this if needed
  }
  
  return result as MechanicStatus;
}

/**
 * Get mechanic's current availability status
 */
export async function getMechanicAvailability(mechanicId: string): Promise<MechanicAvailability> {
  const { data, error } = await supabaseAdmin
    .from('mechanic_status')
    .select('is_online, current_lat, current_lng, updated_at, vehicle_type')
    .eq('profile_id', mechanicId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || { is_online: false, current_lat: null, current_lng: null, vehicle_type: null };
}

/**
 * Update mechanic's current location (for real-time tracking)
 */
export async function updateMechanicLocation(
  mechanicId: string, 
  lat: number, 
  lng: number
): Promise<MechanicStatus> {
  const payload: Partial<MechanicStatus> = {
    profile_id: mechanicId,
    current_lat: lat,
    current_lng: lng,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabaseAdmin
    .from('mechanic_status')
    .upsert(payload, { onConflict: 'profile_id' })
    .select()
    .single();

  if (error) throw error;

  // Emit socket event for real-time location updates
  if (emitMechanicLocation) {
    emitMechanicLocation({
      mechanic_id: mechanicId,
      current_lat: lat,
      current_lng: lng,
      updated_at: new Date().toISOString()
    });
  }

  return data as MechanicStatus;
}

/**
 * Get mechanic by ID with all details
 */
export async function getMechanicById(mechanicId: string): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id, 
      full_name, 
      email, 
      phone, 
      role,
      mechanic_status:mechanic_status(*)
    `)
    .eq('id', mechanicId)
    .eq('role', 'mechanic')
    .single();

  if (error) throw error;
  return data;
}
/**
 * Get all mechanics (admin function)
 */
export async function getAllMechanics(): Promise<Mechanic[]> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id, 
      full_name, 
      email, 
      phone,
      mechanic_status:mechanic_status(*)
    `)
    .eq('role', 'mechanic')
    .order('full_name', { ascending: true });

  if (error) throw error;
  
  return (data || []).map((item: any) => ({
    id: item.id,
    full_name: item.full_name,
    email: item.email,
    phone: item.phone,
    is_online: item.mechanic_status?.is_online ?? false,
    vehicle_type: item.mechanic_status?.vehicle_type,
    current_lat: item.mechanic_status?.current_lat,
    current_lng: item.mechanic_status?.current_lng,
    distance_km: null
  }));
}

/**
 * Get online mechanics count
 */
export async function getOnlineMechanicsCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('mechanic_status')
    .select('*', { count: 'exact', head: true })
    .eq('is_online', true);

  if (error) throw error;
  return count || 0;
}

/**
 * Get mechanic's current booking (active job)
 */
export async function getMechanicCurrentBooking(mechanicId: string): Promise<BookingWithCustomer | null> {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      customer:profiles!bookings_customer_id_fkey(
        full_name, 
        email, 
        phone
      )
    `)
    .eq('mechanic_id', mechanicId)
    .in('status', ['accepted', 'on_the_way', 'arrived'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as BookingWithCustomer || null;
}


/**
 * Get mechanic's booking history
 */
export async function getMechanicBookingHistory(
  mechanicId: string, 
  limit: number = 50
): Promise<BookingWithCustomer[]> {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      customer:profiles!bookings_customer_id_fkey(
        full_name, 
        email
      )
    `)
    .eq('mechanic_id', mechanicId)
    .in('status', ['completed', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Update mechanic's vehicle type
 */
export async function updateMechanicVehicleType(
  mechanicId: string, 
  vehicleType: string
): Promise<MechanicStatus> {
  const payload: Partial<MechanicStatus> = {
    profile_id: mechanicId,
    vehicle_type: vehicleType,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabaseAdmin
    .from('mechanic_status')
    .upsert(payload, { onConflict: 'profile_id' })
    .select()
    .single();

  if (error) throw error;
  return data as MechanicStatus;
}

/**
 * Calculate distance between two coordinates
 */
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

/**
 * Find the nearest available mechanic to a location
 */
export async function findNearestMechanic(
  lat: number, 
  lng: number, 
  maxDistanceKm: number = 10
): Promise<NearestMechanic | null> {
  const { data, error } = await supabaseAdmin
    .from('mechanic_status')
    .select('profile_id, current_lat, current_lng, is_online, vehicle_type')
    .eq('is_online', true);

  if (error) throw error;

  let nearest: NearestMechanic | null = null;
  let minDistance: number = Infinity;

  for (const mech of data || []) {
    if (!mech.current_lat || !mech.current_lng) continue;

    const distance = calculateDistance(lat, lng, mech.current_lat, mech.current_lng);
    
    if (distance <= maxDistanceKm && distance < minDistance) {
      minDistance = distance;
      nearest = {
        mechanic_id: mech.profile_id,
        distance_km: distance,
        vehicle_type: mech.vehicle_type
      };
    }
  }

  return nearest;
}

/**
 * Bulk update mechanic locations (for admin dashboard)
 */
export async function updateMechanicLocationsBulk(
  updates: BulkLocationUpdate[]
): Promise<BulkUpdateResult> {
  const results: any[] = [];
  const errors: Array<{ mechanicId: string; error: string }> = [];

  for (const update of updates) {
    try {
      const result = await updateMechanicLocation(
        update.mechanicId, 
        update.lat, 
        update.lng
      );
      results.push(result);
    } catch (error: any) {
      errors.push({ mechanicId: update.mechanicId, error: error.message });
    }
  }

  return { success: results, failed: errors };
}

/**
 * Get mechanics within specific radius with their current bookings
 */
export async function getMechanicsWithActiveBookings(
  lat: number, 
  lng: number, 
  radiusKm: number = 10
): Promise<Array<Mechanic & { current_booking: BookingWithCustomer | null }>> {
  const mechanics = await getNearbyMechanics(lat, lng, radiusKm);
  
  const mechanicsWithBookings = await Promise.all(
    mechanics.map(async (mechanic) => {
      const currentBooking = await getMechanicCurrentBooking(mechanic.id);
      return {
        ...mechanic,
        current_booking: currentBooking
      };
    })
  );
  
  return mechanicsWithBookings;
}

/**
 * Update mechanic's status to offline and clear location
 */
export async function setMechanicOffline(mechanicId: string): Promise<void> {
  const payload = {
    profile_id: mechanicId,
    is_online: false,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseAdmin
    .from('mechanic_status')
    .upsert(payload, { onConflict: 'profile_id' });

  if (error) throw error;
}

/**
 * Get all online mechanics with their details
 */
export async function getOnlineMechanics(): Promise<Mechanic[]> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id, 
      full_name, 
      email, 
      phone,
      mechanic_status:mechanic_status(*)
    `)
    .eq('role', 'mechanic')
    .eq('mechanic_status.is_online', true);

  if (error) throw error;
  
  return (data || []).map((item: any) => ({
    id: item.id,
    full_name: item.full_name,
    email: item.email,
    phone: item.phone,
    is_online: true,
    vehicle_type: item.mechanic_status?.vehicle_type,
    current_lat: item.mechanic_status?.current_lat,
    current_lng: item.mechanic_status?.current_lng,
    distance_km: null
  }));
}

/**
 * Check if mechanic is online
 */
export async function isMechanicOnline(mechanicId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('mechanic_status')
    .select('is_online')
    .eq('profile_id', mechanicId)
    .single();

  if (error && error.code !== 'PGRST116') return false;
  return data?.is_online || false;
}