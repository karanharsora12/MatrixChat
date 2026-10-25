import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private currentConversationId: string | null = null;

  connect() {
    if (this.socket?.connected) return this.socket;

    const token = localStorage.getItem('matrix_session_token');
    const serverUrl = window.location.port === '5173' ? 'http://localhost:5000' : '/';

    this.socket = io(serverUrl, {
      withCredentials: true,
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to MatrixChat server:', this.socket?.id);
      // Auto-rejoin active conversation if user had one open
      if (this.currentConversationId) {
        console.log('[Socket] Rejoining active conversation:', this.currentConversationId);
        this.socket?.emit('join_conversation', { conversationId: this.currentConversationId });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  joinConversation(conversationId: string) {
    this.currentConversationId = conversationId;
    if (!this.socket?.connected) {
      // Connect if not yet connected
      this.connect();
      return;
    }
    this.socket.emit('join_conversation', { conversationId });
  }

  leaveConversation(conversationId: string) {
    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null;
    }
    if (!this.socket?.connected) return;
    this.socket.emit('leave_conversation', { conversationId });
  }

  sendMessage(data: {
    conversationId: string;
    content: string;
    replyToId?: string | null;
    messageType?: string;
    attachment?: any;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      this.socket.emit('send_message', data, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response?.message);
        }
      });
    });
  }

  startTyping(conversationId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing_start', { conversationId });
  }

  stopTyping(conversationId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing_stop', { conversationId });
  }

  markRead(conversationId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('mark_read', { conversationId });
  }

  disconnect() {
    this.currentConversationId = null;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
