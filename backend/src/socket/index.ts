import { Server } from 'socket.io';

let ioInstance: Server;

export function initSocket(io: Server) {
  ioInstance = io;

  io.on('connection', (socket) => {
    socket.on('join:booking', (bookingId: string) => {
      socket.join(`booking:${bookingId}`);
    });
  });
}

export function emitBookingUpdate(bookingId: string, payload: unknown) {
  if (!ioInstance) return;
  ioInstance.to(`booking:${bookingId}`).emit('booking:updated', payload);
}

export function emitMechanicLocation(data: any) {
  if (ioInstance) {
    ioInstance.emit('mechanic:locationUpdate', data);
  }
}