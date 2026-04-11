import { io } from 'socket.io-client';

export const socket = io(process.env.EXPO_PUBLIC_API_URL!, {
  transports: ['websocket']
});
