import { Router } from 'express';
import { getServices } from '../services/booking.service';

export const servicesRouter = Router();

servicesRouter.get('/', async (_req, res) => {
  const data = await getServices();
  res.json(data);
});
