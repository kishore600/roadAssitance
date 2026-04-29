export interface SavedLocation {
    id: string;
    customer_id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface Booking {
    customer:any
    id: string;
    customer_rating:any
    mechanic_rating:any
    customer_id: string;
    mechanic_id: string | null;
    service_id: string;
    issue_note: string;
    status: 'requested' | 'accepted' | 'on_the_way' | 'arrived' | 'completed' | 'cancelled';
    customer_lat: number;
    customer_lng: number;
    customer_address: string;
    eta_minutes: number | null;
    amount: number | null;
    created_at: string;
    updated_at: string;
    expires_at: string;
    cancellation_reason: string | null;
    mechanic?: Mechanic;
    mechanic_location?: {
        lat: number;
        lng: number;
    };
    saved_location_id?: string;
    vehicle_type : string;
    vehicle_model : string;
}

export interface ServiceItem {
    id: string;
    name: string;
    base_price: number;
    created_at: string;
}

export interface Mechanic {
    id: string;
    full_name: string;
    is_online: boolean;
    vehicle_type: string | null;
    current_lat: number | null;
    current_lng: number | null;
    distance?: number;
}