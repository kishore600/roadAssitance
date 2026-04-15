// routes/mechanics.routes.js

import { Router } from 'express';
import { 
  getNearbyMechanics, 
  updateMechanicAvailability, 
  updateMechanicLocation,
  getMechanicAvailability,
  getMechanicById,
  getAllMechanics,
  getOnlineMechanicsCount,
  getMechanicCurrentBooking,
  getMechanicBookingHistory,
  findNearestMechanic
} from '../services/mechanic.service';

export const mechanicsRouter = Router();

// Get nearby mechanics
mechanicsRouter.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radiusKm } = req.query;
    const data = await getNearbyMechanics(
      lat ? parseFloat(lat as string) : undefined,
      lng ? parseFloat(lng as string) : undefined,
      radiusKm ? parseFloat(radiusKm as string) : 10
    );
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nearby mechanics' });
  }
});

// Update mechanic availability (online/offline)
mechanicsRouter.patch('/:mechanicId/availability', async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const { isOnline, currentLat, currentLng } = req.body;
    const data = await updateMechanicAvailability(mechanicId, { 
      isOnline, 
      currentLat, 
      currentLng 
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// Get mechanic availability status
mechanicsRouter.get('/:mechanicId/availability', async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const data = await getMechanicAvailability(mechanicId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get availability' });
  }
});

// Update mechanic location
mechanicsRouter.patch('/:mechanicId/location', async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const { lat, lng } = req.body;
    const data = await updateMechanicLocation(mechanicId, lat, lng);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get mechanic by ID
mechanicsRouter.get('/:mechanicId', async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const data = await getMechanicById(mechanicId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch mechanic' });
  }
});

// Get all mechanics (admin)
mechanicsRouter.get('/', async (req, res) => {
  try {
    const data = await getAllMechanics();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch mechanics' });
  }
});

// Get online mechanics count
mechanicsRouter.get('/stats/online-count', async (req, res) => {
  try {
    const count = await getOnlineMechanicsCount();
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get online count' });
  }
});

// Get mechanic's current booking
mechanicsRouter.get('/:mechanicId/current-booking', async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const data = await getMechanicCurrentBooking(mechanicId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch current booking' });
  }
});

// Get mechanic's booking history
mechanicsRouter.get('/:mechanicId/history', async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const data = await getMechanicBookingHistory(mechanicId, limit);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch booking history' });
  }
});

// Find nearest mechanic
mechanicsRouter.get('/nearest/find', async (req, res) => {
  try {
    const { lat, lng, maxDistanceKm } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }
    const data = await findNearestMechanic(
      parseFloat(lat as string),
      parseFloat(lng as string),
      maxDistanceKm ? parseFloat(maxDistanceKm as string) : 10
    );
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to find nearest mechanic' });
  }
});