import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';

const onlineUsers = new Map<number, string>();

export function setupSocket(io: Server): void {
  // Authentication middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Token de autenticacao nao fornecido'));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      (socket as any).userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Token invalido'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as number;
    onlineUsers.set(userId, socket.id);

    console.log(`User ${userId} connected (socket: ${socket.id})`);

    // Broadcast that user is online
    io.emit('user_online', { userId });

    // Join a match chat room
    socket.on('join_match', (matchId: number) => {
      socket.join(`match_${matchId}`);
    });

    // Leave a match chat room
    socket.on('leave_match', (matchId: number) => {
      socket.leave(`match_${matchId}`);
    });

    // Real-time message sending
    socket.on('send_message', (data: { matchId: number; message: any; otherUserId: number }) => {
      // Broadcast to the match room (excluding sender)
      socket.to(`match_${data.matchId}`).emit('new_message', data.message);

      // Send notification to the specific other user
      const otherSocketId = onlineUsers.get(data.otherUserId);
      if (otherSocketId) {
        io.to(otherSocketId).emit('message_notification', {
          matchId: data.matchId,
          message: data.message
        });
      }
    });

    // Typing indicators
    socket.on('typing', (data: { matchId: number }) => {
      socket.to(`match_${data.matchId}`).emit('user_typing', { userId });
    });

    socket.on('stop_typing', (data: { matchId: number }) => {
      socket.to(`match_${data.matchId}`).emit('user_stop_typing', { userId });
    });

    // Real-time read receipts
    socket.on('mark_read', (data: { matchId: number; otherUserId: number }) => {
      const targetSocketId = onlineUsers.get(data.otherUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('messages_read', { matchId: data.matchId });
      }
    });

    // Match notification
    socket.on('new_match', (data: { targetUserId: number; match: any }) => {
      const targetSocketId = onlineUsers.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('match_notification', data.match);
      }
    });

    // Generic Like notification
    socket.on('send_like', (data: { targetUserId: number }) => {
      const targetSocketId = onlineUsers.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('like_notification');
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('user_offline', { userId });
      console.log(`User ${userId} disconnected`);
    });
  });
}
