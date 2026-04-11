import { Router } from 'express';
import { getNearbyMechanics, updateMechanicAvailability } from '../services/booking.service';

export const mechanicsRouter = Router();

mechanicsRouter.get('/nearby', async (_req, res) => {
  const data = await getNearbyMechanics();
  res.json(data);
});

mechanicsRouter.patch('/:mechanicId/availability', async (req, res) => {
  const data = await updateMechanicAvailability(req.params.mechanicId, req.body);
  res.json(data);
});
