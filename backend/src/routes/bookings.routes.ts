import { Router } from "express";
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
  getMechanicBookings,
  generateCompletionOTP,
  verifyOTPAndComplete,
  addMechanicRating,
  getMechanicRating,
  addCustomerRating,
  getMechanicTodayEarnings,
} from "../services/booking.service";
import { VEHICLE_TYPES } from '../constants/vehicleTypes';

export const bookingsRouter = Router();

bookingsRouter.post("/", async (req, res) => {
  try {
    console.log(req.body)
    const payload = {
      customer_id: req.body.customerId,
      mechanic_id: req.body.mechanicId || null,
      service_id: req.body.serviceId,
      issue_note: req.body.issueNote,
      customer_lat: req.body.customerLat,
      customer_lng: req.body.customerLng,
      customer_address: req.body.customerAddress,
      vehicle_type: req.body.vehicle_type,
      vehicle_model: req.body.vehicle_model,
      amount: req.body.amount|| 299,
    };

    const data = await createBooking(payload);
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to create booking",
      error: err,
    });
  }
});
bookingsRouter.get("/vehicle-types", async (_req, res) => {
  try {
    res.json({ 
      success: true, 
      vehicleTypes: VEHICLE_TYPES 
    });
  } catch (err) {
    console.error("Error fetching vehicle types:", err);
    res.status(500).json({ 
      error: "Failed to fetch vehicle types" 
    });
  }
});
bookingsRouter.get("/customer/:customerId", async (req, res) => {
  const data = await getCustomerBookings(req.params.customerId);
  res.json(data);
});

bookingsRouter.get("/open", async (_req, res) => {
  const data = await getOpenBookings();
  res.json(data);
});

bookingsRouter.patch("/:bookingId/assign", async (req, res) => {
  const data = await assignMechanic(
    req.params.bookingId,
    req.body.mechanicId,
    req.body.etaMinutes || 15,
  );
  res.json(data);
});

bookingsRouter.patch("/:bookingId/status", async (req, res) => {
  const data = await updateBookingStatus(req.params.bookingId, req.body.status);
  res.json(data);
});
bookingsRouter.get("/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const data = await getBookingById(bookingId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});
// Cancel booking (soft delete - update status to cancelled)
bookingsRouter.patch("/:bookingId/cancel", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const data = await cancelBooking(bookingId);
    res.json({
      success: true,
      message: "Booking cancelled successfully",
      data,
    });
  } catch (err) {
    console.error("Error cancelling booking:", err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// Delete booking (hard delete - remove from database)
bookingsRouter.delete("/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await deleteBooking(bookingId);
    res.json({
      success: true,
      message: "Booking deleted successfully",
      data: result,
    });
  } catch (err: any) {
    console.error("Error deleting booking:", err);
    // Send proper error response
    res.status(400).json({
      error: err.message || "Failed to delete booking",
      status: "error",
    });
  }
});

bookingsRouter.patch("/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const updateData = {
      issue_note: req.body.issue_note,
      updated_at: new Date().toISOString(),
    };

    const data = await updateBooking(bookingId, updateData);
    res.json({ success: true, message: "Booking updated successfully", data });
  } catch (err: any) {
    console.error("Error updating booking:", err);
    res.status(500).json({ error: err.message || "Failed to update booking" });
  }
});

bookingsRouter.get("/mechanic/:mechanicId", async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const data = await getMechanicBookings(mechanicId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch mechanic bookings" });
  }
});

// Also add this to handle the specific endpoint used in the app
bookingsRouter.get("/mechanic/:mechanicId/current", async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const data = await getMechanicCurrentBooking(mechanicId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch current booking" });
  }
});

bookingsRouter.post("/:bookingId/generate-otp", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const otp = await generateCompletionOTP(bookingId);

    // In production, send OTP via SMS
    // For now, return it (you might want to show it to mechanic)
    res.json({
      success: true,
      message: "OTP generated successfully",
      otp: otp, // In production, don't return this - send via SMS
    });
  } catch (err: any) {
    console.error("Error generating OTP:", err);
    res.status(500).json({ error: err.message });
  }
});


bookingsRouter.post("/:bookingId/complete-with-otp", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ error: "OTP is required" });
    }

    const booking = await verifyOTPAndComplete(bookingId, otp);
    res.json({
      success: true,
      message: "Service completed successfully",
      data: booking,
    });
  } catch (err: any) {
    console.error("Error completing booking:", err);
    res.status(500).json({ error: err.message });
  }
});

// In your backend routes file

// Endpoint 1: Verify OTP and complete service (without rating)
bookingsRouter.post("/:bookingId/verify-otp", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ error: "OTP is required" });
    }

    const booking = await verifyOTPAndComplete(bookingId, otp);
    res.json({
      success: true,
      message: "Service completed successfully",
      data: booking,
    });
  } catch (err: any) {
    console.error("Error verifying OTP:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint 2: Add rating to completed booking
bookingsRouter.post("/:bookingId/add-rating", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const booking = await addCustomerRating(bookingId, rating, review);
    res.json({
      success: true,
      message: "Rating added successfully",
      data: booking,
    });
  } catch (err: any) {
    console.error("Error adding rating:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mechanic adds rating for customer
bookingsRouter.post("/:bookingId/mechanic-rating", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const booking = await addMechanicRating(bookingId, rating, review);
    res.json({
      success: true,
      message: "Rating submitted successfully",
      data: booking,
    });
  } catch (err: any) {
    console.error("Error submitting rating:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get mechanic's rating stats
bookingsRouter.get("/mechanic/:mechanicId/rating", async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const stats = await getMechanicRating(mechanicId);
    res.json(stats);
  } catch (err: any) {
    console.error("Error fetching rating:", err);
    res.status(500).json({ error: err.message });
  }
});

bookingsRouter.get("/mechanic/:mechanicId/earnings", async (req, res) => {
    try {
        const { mechanicId } = req.params;
        const { date } = req.query;
        
        let earnings;
        // if (date) {
        //     // Get earnings for specific date
        //     earnings = await getMechanicEarningsByDate(mechanicId, date as string);
        // } else {
        //     // Get today's earnings
            earnings = await getMechanicTodayEarnings(mechanicId);
        // }
        
        res.json(earnings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch earnings' });
    }
});