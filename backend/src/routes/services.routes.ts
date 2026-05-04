import { Router } from 'express';
import { 
  getServices, 
  getVehicleTypes, 
  getServicePricing,
  getPricingByVehicleType,
  getPricingByService,
  getPricingForVehicleAndService
} from '../services/booking.service';
import { supabaseAdmin } from '../config/supabase';

export const servicesRouter = Router();

// Get all services (basic)
servicesRouter.get('/', async (_req, res) => {
  try {
    const data = await getServices();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all vehicle types
servicesRouter.get('/vehicle-types', async (_req, res) => {
  try {
    const data = await getVehicleTypes();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get complete pricing matrix (using view)
servicesRouter.get('/pricing', async (_req, res) => {
  try {
    const data = await getServicePricing();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get pricing by vehicle type ID (INTEGER)
servicesRouter.get('/pricing/vehicle/:vehicleTypeId', async (req, res) => {
  try {
    console.log(req.params)
    const { vehicleTypeId } = req.params;
    const data = await getPricingByVehicleType(parseInt(vehicleTypeId));
    console.log(data)
    res.json(data);
  } catch (error: any) {
    console.log(error)
    res.status(500).json({ error: error.message });
  }
});

// Get pricing by service ID (UUID)
servicesRouter.get('/pricing/service/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const data = await getPricingByService(serviceId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific pricing for vehicle and service combination
servicesRouter.get('/pricing/:vehicleTypeId/:serviceId', async (req, res) => {
  try {
    const { vehicleTypeId, serviceId } = req.params;
    const data = await getPricingForVehicleAndService(
      parseInt(vehicleTypeId), 
      serviceId
    );
    if (!data) {
      return res.status(404).json({ error: 'Pricing not found' });
    }
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all pricing with optional filters
servicesRouter.get('/pricing/filter', async (req, res) => {
  try {
    const { vehicleTypeId, serviceId } = req.query;
    
    let query: any = {};
    
    if (vehicleTypeId) {
      query.vehicle_type_id = parseInt(vehicleTypeId as string);
    }
    
    if (serviceId) {
      query.service_id = serviceId as string;
    }
    
    const { data, error } = await supabaseAdmin
      .from('service_pricing')
      .select(`
        *,
        services:service_id (id, name, base_price),
        vehicle_types:vehicle_type_id (id, name, category, display_order)
      `)
      .match(query)
      .order('vehicle_type_id');
      
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});