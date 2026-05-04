import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface PricingItem {
  vehicle_type: string;
  category: string;
  display_order: number;
  service_name: string;
  price: number;
  notes: string | null;
}

interface Service {
  id: number;
  name: string;
  base_price: number;
}

interface VehicleType {
  id: number;
  name: string;
  category: string;
  display_order: number;
}

export const PricingMatrix: React.FC = () => {
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [pricingRes, servicesRes, vehiclesRes] = await Promise.all([
        axios.get('/api/services/pricing'),
        axios.get('/api/services'),
        axios.get('/api/services/vehicle-types')
      ]);
      setPricing(pricingRes.data);
      setServices(servicesRes.data);
      setVehicleTypes(vehiclesRes.data);
    } catch (err) {
      setError('Failed to load pricing data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-8">Loading pricing data...</div>;
  if (error) return <div className="text-red-500 text-center p-8">{error}</div>;

  // Group pricing by vehicle type
  const groupedByVehicle = pricing.reduce((acc, item) => {
    if (!acc[item.vehicle_type]) {
      acc[item.vehicle_type] = [];
    }
    acc[item.vehicle_type].push(item);
    return acc;
  }, {} as Record<string, PricingItem[]>);

  // Get unique service names
  const serviceNames = [...new Set(pricing.map(p => p.service_name))];

  // Filter vehicle types based on selection
  const filteredVehicleTypes = selectedVehicle === 'all' 
    ? vehicleTypes 
    : vehicleTypes.filter(vt => vt.category === selectedVehicle);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Mobile Puncture Services Pricing</h1>
      
      {/* Filter Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Filter by Vehicle Category:</label>
        <select 
          value={selectedVehicle}
          onChange={(e) => setSelectedVehicle(e.target.value)}
          className="p-2 border rounded-md"
        >
          <option value="all">All Vehicles</option>
          <option value="Two-wheeler">Two-wheelers</option>
          <option value="Four-wheeler">Four-wheelers</option>
          <option value="Auto">Auto</option>
          <option value="Commercial">Commercial</option>
          <option value="Heavy">Heavy Vehicles</option>
        </select>
      </div>

      {/* Pricing Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">Vehicle Type</th>
              {serviceNames.map(service => (
                <th key={service} className="px-4 py-2 border">
                  {service}
                </th>
              ))}
              <th className="px-4 py-2 border">Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicleTypes.map(vehicle => {
              const vehiclePricing = pricing.filter(p => p.vehicle_type === vehicle.name);
              const pricingMap = new Map(
                vehiclePricing.map(p => [p.service_name, p])
              );
              
              return (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border font-medium">
                    {vehicle.name}
                    <div className="text-xs text-gray-500">{vehicle.category}</div>
                  </td>
                  {serviceNames.map(service => {
                    const item = pricingMap.get(service);
                    return (
                      <td key={service} className="px-4 py-2 border text-center">
                        {item ? `₹${item.price.toLocaleString()}` : '-'}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 border text-sm text-gray-600">
                    {vehiclePricing[0]?.notes || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Service Summary Cards */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Service Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(service => (
            <div key={service.id} className="bg-white p-4 rounded-lg shadow border">
              <h3 className="font-semibold text-lg">{service.name}</h3>
              <p className="text-gray-600">Base Price: ₹{service.base_price}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};