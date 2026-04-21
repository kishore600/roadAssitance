// server/socket.js - Fixed version
import { Server } from 'socket.io';

let io:any;

export function initSocket(server:any) {
  io = server;
  
  io.on('connection', (socket:any) => {
    console.log('User connected:', socket.id);

    // Join booking room
    socket.on('join:booking', (bookingId:any) => {
      if (bookingId) {
        socket.join(`booking:${bookingId}`);
        console.log(`Socket ${socket.id} joined booking:${bookingId}`);
      }
    });

    // Join mechanic room for location updates
    socket.on('join:mechanic', (mechanicId:any) => {
      if (mechanicId) {
        socket.join(`mechanic:${mechanicId}`);
        console.log(`Socket ${socket.id} joined mechanic:${mechanicId}`);
      }
    });

    // Handle mechanic accepting booking
    socket.on('booking:accept', (data:any) => {
      const { bookingId, mechanic, eta } = data;
      console.log(`Booking accepted: ${bookingId} by mechanic ${mechanic?.id}`);
      
      if (bookingId) {
        // Emit to customer who requested this booking
        io.to(`booking:${bookingId}`).emit('booking:accepted', {
          booking: { 
            id: bookingId, 
            status: 'accepted', 
            eta_minutes: eta || 15,
            mechanic: mechanic
          },
          mechanic: mechanic
        });
        
        // Also emit general update
        io.to(`booking:${bookingId}`).emit('booking:updated', {
          id: bookingId,
          status: 'accepted',
          mechanic_id: mechanic?.id,
          eta_minutes: eta || 15
        });
      }
    });

    // Handle status updates
    socket.on('booking:status:update', (data:any) => {
      const { bookingId, status, timestamp, mechanicLocation } = data;
      console.log(`Booking status update: ${bookingId} -> ${status}`);
      
      if (bookingId) {
        io.to(`booking:${bookingId}`).emit('booking:status:updated', {
          id: bookingId,
          status: status,
          updated_at: timestamp || new Date().toISOString(),
          ...(mechanicLocation && { mechanic_location: mechanicLocation })
        });
      }
    });

    // Handle real-time location updates from mechanic
    socket.on('mechanic:location:update', (data:any) => {
      const { bookingId, location, eta, mechanicId } = data;
      
      console.log(`Received mechanic location update - Booking: ${bookingId}, Location:`, location);
      
      if (bookingId && location) {
        // Ensure location has the correct format
        const locationData = {
          bookingId: bookingId,
          location: {
            lat: location.lat || location.latitude,
            lng: location.lng || location.longitude
          },
          eta: eta || 0,
          timestamp: new Date().toISOString(),
          mechanicId: mechanicId
        };
        
        // Emit to the specific booking room
        io.to(`booking:${bookingId}`).emit('mechanic:location:update', locationData);
        console.log(`Emitted location update to booking:${bookingId}`);
      }
    });

    // Alternative event name that mechanics might be using
    socket.on('mechanic:location', (data:any) => {
      console.log('Received mechanic:location event:', data);
      
      const { bookingId, location, eta, mechanicId } = data;
      
      if (bookingId && location) {
        const locationData = {
          bookingId: bookingId,
          location: {
            lat: location.lat || location.latitude,
            lng: location.lng || location.longitude
          },
          eta: eta || 0,
          timestamp: new Date().toISOString(),
          mechanicId: mechanicId
        };
        
        io.to(`booking:${bookingId}`).emit('mechanic:location:update', locationData);
      }
    });

    // Handle booking completion
    socket.on('booking:complete', (data:any) => {
      const { bookingId, completedAt } = data;
      console.log(`Booking completed: ${bookingId}`);
      
      if (bookingId) {
        io.to(`booking:${bookingId}`).emit('booking:completed', {
          bookingId: bookingId,
          completedAt: completedAt || new Date().toISOString()
        });
      }
    });

    // Handle new booking creation
    socket.on('booking:new', (bookingData:any) => {
      console.log(`New booking created: ${bookingData.id}`);
      // Broadcast to all mechanics (or specific room)
      io.emit('booking:new', bookingData);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
  
  return io;
}

// Helper functions to emit events from elsewhere in the app
export function emitBookingUpdate(bookingId:any, data:any) {
  if (io) {
    io.to(`booking:${bookingId}`).emit('booking:updated', data);
  }
}

export function emitMechanicLocation(data:any) {
  if (io && data.profile_id) {
    io.to(`mechanic:${data.profile_id}`).emit('mechanic:location:updated', data);
  }
}

export function emitNewBooking(bookingData:any) {
  if (io) {
    io.emit('booking:new', bookingData);
  }
}

export function getIO() {
  return io;
}