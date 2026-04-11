import { Router } from 'express';
import {
  assignMechanic,
  createBooking,
  getCustomerBookings,
  getOpenBookings,
  updateBookingStatus
} from '../services/booking.service';

export const bookingsRouter = Router();

bookingsRouter.post('/', async (req, res) => {
  try {
    const payload = {
      customer_id: req.body.customerId,
      mechanic_id: req.body.mechanicId || null,
      service_id: req.body.serviceId,
      issue_note: req.body.issueNote,
      customer_lat: req.body.customerLat,
      customer_lng: req.body.customerLng,
      customer_address: req.body.customerAddress,
      amount: 299
    };

    const data = await createBooking(payload);
    res.status(201).json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Failed to create booking',
      error: err
    });
  }
});

bookingsRouter.get('/customer/:customerId', async (req, res) => {
  const data = await getCustomerBookings(req.params.customerId);
  res.json(data);
});

bookingsRouter.get('/open', async (_req, res) => {
  const data = await getOpenBookings();
  res.json(data);
});

bookingsRouter.patch('/:bookingId/assign', async (req, res) => {
  const data = await assignMechanic(req.params.bookingId, req.body.mechanicId, req.body.etaMinutes || 15);
  res.json(data);
});

bookingsRouter.patch('/:bookingId/status', async (req, res) => {
  const data = await updateBookingStatus(req.params.bookingId, req.body.status);
  res.json(data);
});
