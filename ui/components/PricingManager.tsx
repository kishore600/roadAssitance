import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface ServicePricing {
  id: number;
  service_id: number;
  vehicle_type_id: number;
  price: number;
  notes: string | null;
  services?: { name: string };
  vehicle_types?: { name: string; category: string };
}

export const PricingManager: React.FC = () => {
  const [pricing, setPricing] = useState<ServicePricing[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [editing, setEditing] = useState<ServicePricing | null>(null);
  const [formData, setFormData] = useState({ price: 0, notes: '' });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [pricingRes, servicesRes, vehiclesRes] = await Promise.all([
        axios.get('/api/services/pricing'),
        axios.get('/api/services'),
        axios.get('/api/services/vehicle-types')
      ]);
      setPricing(pricingRes.data);
      setServices(servicesRes.data);
      setVehicleTypes(vehiclesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleEdit = (item: ServicePricing) => {
    setEditing(item);
    setFormData({ price: item.price, notes: item.notes || '' });
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await axios.put(`/api/admin/pricing/${editing.id}`, formData);
      await fetchAllData();
      setEditing(null);
    } catch (error) {
      console.error('Failed to update pricing:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Manage Service Pricing</h1>
      
      {/* Pricing Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">Service</th>
              <th className="px-4 py-2 border">Vehicle Type</th>
              <th className="px-4 py-2 border">Price (₹)</th>
              <th className="px-4 py-2 border">Notes</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pricing.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border">{item.services?.name}</td>
                <td className="px-4 py-2 border">
                  {item.vehicle_types?.name}
                  <div className="text-xs text-gray-500">{item.vehicle_types?.category}</div>
                </td>
                <td className="px-4 py-2 border text-right">
                  ₹{item.price.toLocaleString()}
                </td>
                <td className="px-4 py-2 border">{item.notes || '-'}</td>
                <td className="px-4 py-2 border">
                  <button
                    onClick={() => handleEdit(item)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Edit Pricing</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Price (₹)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-2 border rounded-md"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};