export type ServiceItem = {
  id: string;
  name: string;
  base_price: number;
};

export type Mechanic = {
  id: string;
  full_name: string;
  vehicle_type?: string;
  is_online: boolean;
  current_lat?: number;
  current_lng?: number;
};

export type Booking = {
  id: string;
  status: 'requested' | 'accepted' | 'on_the_way' | 'arrived' | 'completed' | 'cancelled';
  issue_note?: string;
  eta_minutes?: number;
  amount?: number;
  mechanic_id?: string;
  customer_address?: string;
  created_at: string;
};
