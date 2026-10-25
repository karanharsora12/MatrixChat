import { User, Contact, Conversation, Message, PrivacySettings } from '../types';

const API_BASE = '/api';

class ApiClient {
  private getHeaders(isJson = true): HeadersInit {
    const headers: Record<string, string> = {};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    const token = localStorage.getItem('matrix_session_token');
    if (token) {
      headers['x-session-token'] = token;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isFormData = options.body instanceof FormData;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...this.getHeaders(!isFormData),
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || 'Network request failed');
    }

    return data as T;
  }

  // Auth
  async requestOtp(
    params: { phoneNumber?: string; countryCode?: string; email?: string; identifier?: string; type?: 'phone' | 'email' } | string,
    countryCodeFallback = '+1'
  ) {
    const payload = typeof params === 'string'
      ? { phoneNumber: params, countryCode: countryCodeFallback }
      : params;

    return this.request<{
      success: boolean;
      message: string;
      identifier?: string;
      phoneNumber?: string;
      email?: string;
      type?: 'phone' | 'email';
      resendAfter: number;
      isDev?: boolean;
      devCode?: string;
    }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async verifyOtp(
    params: { phoneNumber?: string; email?: string; identifier?: string; otp: string } | string,
    otpFallback?: string
  ) {
    const payload = typeof params === 'string'
      ? { phoneNumber: params, otp: otpFallback || '' }
      : params;

    const res = await this.request<{
      success: boolean;
      user: User;
      isNewUser: boolean;
      token?: string;
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.token) {
      localStorage.setItem('matrix_session_token', res.token);
    }
    return res;
  }

  async getSession() {
    return this.request<{ authenticated: boolean; user: User }>('/auth/session', {
      method: 'GET',
    });
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('matrix_session_token');
    }
  }

  // Users
  async getMe() {
    return this.request<User>('/users/me');
  }

  async updateMe(data: { displayName?: string; about?: string; avatarUrl?: string }) {
    return this.request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updatePrivacy(data: Partial<PrivacySettings>) {
    return this.request<PrivacySettings>('/users/me/privacy', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Contacts
  async searchContact(params: { phoneNumber?: string; email?: string; query?: string } | string) {
    const payload = typeof params === 'string'
      ? (params.includes('@') ? { email: params } : { phoneNumber: params })
      : params;

    return this.request<{
      id: string;
      displayName: string;
      originalDisplayName: string | null;
      avatarUrl: string | null;
      about: string | null;
      isContact: boolean;
      customName: string | null;
      phoneNumber?: string | null;
      email?: string | null;
    }>('/contacts/search', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listContacts() {
    return this.request<Contact[]>('/contacts');
  }

  async saveContact(contactUserId: string, customName?: string) {
    return this.request('/contacts', {
      method: 'POST',
      body: JSON.stringify({ contactUserId, customName }),
    });
  }

  async deleteContact(contactUserId: string) {
    return this.request(`/contacts/${contactUserId}`, { method: 'DELETE' });
  }

  async blockUser(targetUserId: string) {
    return this.request('/contacts/block', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  }

  async unblockUser(targetUserId: string) {
    return this.request('/contacts/unblock', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  }

  // Conversations
  async listConversations() {
    return this.request<Conversation[]>('/conversations');
  }

  async getOrCreateDirectConversation(targetUserId: string) {
    return this.request<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  }

  async getConversation(id: string) {
    return this.request<Conversation>(`/conversations/${id}`);
  }

  async updateConversationSettings(id: string, settings: { isPinned?: boolean; isMuted?: boolean }) {
    return this.request(`/conversations/${id}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  // Messages
  async getMessages(conversationId: string, limit = 50, before?: string) {
    const query = new URLSearchParams({ limit: limit.toString() });
    if (before) query.append('before', before);
    return this.request<Message[]>(`/conversations/${conversationId}/messages?${query.toString()}`);
  }

  async sendMessage(
    conversationId: string,
    content: string,
    replyToId?: string | null,
    messageType = 'text',
    attachment?: any
  ) {
    return this.request<Message>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, replyToId, messageType, attachment }),
    });
  }

  async deleteMessage(messageId: string) {
    return this.request(`/messages/${messageId}`, { method: 'DELETE' });
  }

  async markRead(conversationId: string) {
    return this.request(`/conversations/${conversationId}/read`, { method: 'POST' });
  }

  // Uploads
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{
      success: boolean;
      file: {
        fileName: string;
        filePath: string;
        mimeType: string;
        fileSize: number;
      };
    }>('/uploads', {
      method: 'POST',
      body: formData,
    });
  }
}

export const api = new ApiClient();
