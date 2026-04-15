export interface ServiceItem {
  id: string;
  name: string;
  base_price: number;
  description?: string;
}

export interface Mechanic {
  id: string;
  full_name: string;
  is_online: boolean;
  vehicle_type?: string;
  current_lat?: number;
  current_lng?: number;
}

export interface Booking {
  id: string;
  customer_id: string;
  mechanic_id?: string;
  service_id: string;
  status: 'requested' | 'accepted' | 'on_the_way' | 'arrived' | 'completed' | 'cancelled';
  issue_note?: string;
  customer_lat: number;
  customer_lng: number;
  customer_address?: string;
  eta_minutes?: number;
  amount?: number;
  created_at: string;
  updated_at: string;
}