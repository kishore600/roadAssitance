import { Router } from 'express';
import {
  assignMechanic,
  createBooking,
  getCustomerBookings,
  getOpenBookings,
  updateBookingStatus,
  deleteBooking,
  cancelBooking,
  updateBooking,
  getBookingById,
  getMechanicCurrentBooking,
  getMechanicBookings
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
bookingsRouter.get('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const data = await getBookingById(bookingId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});
// Cancel booking (soft delete - update status to cancelled)
bookingsRouter.patch('/:bookingId/cancel', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const data = await cancelBooking(bookingId);
    res.json({ success: true, message: 'Booking cancelled successfully', data });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Delete booking (hard delete - remove from database)
bookingsRouter.delete('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await deleteBooking(bookingId);
    res.json({ success: true, message: 'Booking deleted successfully', data: result });
  } catch (err: any) {
    console.error('Error deleting booking:', err);
    // Send proper error response
    res.status(400).json({ 
      error: err.message || 'Failed to delete booking',
      status: 'error'
    });
  }
});

bookingsRouter.patch('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const updateData = {
      issue_note: req.body.issue_note,
      updated_at: new Date().toISOString()
    };
    
    const data = await updateBooking(bookingId, updateData);
    res.json({ success: true, message: 'Booking updated successfully', data });
  } catch (err: any) {
    console.error('Error updating booking:', err);
    res.status(500).json({ error: err.message || 'Failed to update booking' });
  }
});

bookingsRouter.get('/mechanic/:mechanicId', async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const data = await getMechanicBookings(mechanicId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch mechanic bookings' });
  }
});

// Also add this to handle the specific endpoint used in the app
bookingsRouter.get('/mechanic/:mechanicId/current', async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const data = await getMechanicCurrentBooking(mechanicId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch current booking' });
  }
});