// types/booking.types.ts
export interface VehicleType {
  id: string;
  name: string;
  category: '2-wheeler' | '3-wheeler' | '4-wheeler';
  size: 'small' | 'medium' | 'large';
  examples?: string[];
}

export const VEHICLE_TYPES: VehicleType[] = [
  { id: 'motorcycle', name: 'Motorcycle/Scooter', category: '2-wheeler', size: 'small', examples: ['Activa', 'Pulsar', 'Scooty'] },
  { id: 'bike', name: 'Bike', category: '2-wheeler', size: 'small', examples: ['Royal Enfield', 'KTM', 'Duke'] },
  { id: 'auto', name: 'Auto-rickshaw', category: '3-wheeler', size: 'medium', examples: ['Bajaj Auto', 'Piaggio'] },
  { id: 'hatchback', name: 'Hatchback', category: '4-wheeler', size: 'small', examples: ['Maruti Swift', 'Hyundai i10', 'Tata Punch'] },
  { id: 'sedan', name: 'Sedan', category: '4-wheeler', size: 'medium', examples: ['Honda City', 'Hyundai Verna', 'Maruti Ciaz'] },
  { id: 'suv', name: 'SUV/MPV', category: '4-wheeler', size: 'large', examples: ['Hyundai Creta', 'MG Hector', 'Toyota Innova'] },
  { id: 'luxury', name: 'Luxury Car', category: '4-wheeler', size: 'large', examples: ['BMW', 'Mercedes', 'Audi'] }
];