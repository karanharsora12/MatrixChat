import React, { useState, useEffect } from 'react';
import { Contact, Conversation } from '../../types';
import { api, getMediaUrl } from '../../services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Search, UserPlus, RefreshCw, Mail } from 'lucide-react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conv: Conversation) => void;
}

export function NewChatModal({ isOpen, onClose, onSelectConversation }: NewChatModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [foundUser, setFoundUser] = useState<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
    about: string | null;
    isContact: boolean;
    customName: string | null;
    email?: string | null;
    phoneNumber?: string | null;
  } | null>(null);

  const [savedContacts, setSavedContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSavedContacts();
      setFoundUser(null);
      setError(null);
      setEmail('');
    }
  }, [isOpen]);

  const loadSavedContacts = async () => {
    try {
      setLoadingContacts(true);
      const list = await api.listContacts();
      setSavedContacts(list);
    } catch (err) {
      console.error('[Load Contacts Error]', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFoundUser(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter an email address or username to search.');
      return;
    }

    try {
      setLoading(true);
      const user = await api.searchContact(
        trimmed.includes('@') ? { email: trimmed } : { query: trimmed }
      );
      setFoundUser(user);
    } catch (err: any) {
      setError(err.message || 'No registered MatrixChat user found.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChatWithUserId = async (targetUserId: string) => {
    try {
      setLoading(true);
      const conv = await api.getOrCreateDirectConversation(targetUserId);
      onSelectConversation(conv);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Could not initiate conversation.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async (contactUserId: string, defaultName: string) => {
    try {
      setLoading(true);
      await api.saveContact(contactUserId, defaultName);

      if (foundUser && foundUser.id === contactUserId) {
        setFoundUser({ ...foundUser, isContact: true });
      }

      await loadSavedContacts();
    } catch (err: any) {
      setError(err.message || 'Failed to save contact.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px] p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#00a884]" />
            <span>New Chat</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Search form */}
          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Search User by Email
              </label>
              <div className="flex rounded-xl border border-input overflow-hidden bg-background focus-within:ring-1 focus-within:ring-[#00a884]">
                <div className="px-3 py-2 text-muted-foreground flex items-center">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-2 py-2 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <Button
                  type="submit"
                  variant="matrix"
                  disabled={loading || !email.trim()}
                  className="rounded-none px-4 h-11"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </form>

          {/* Search Error */}
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {/* Found User Card */}
          {foundUser && (
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="w-12 h-12 border border-border">
                  {foundUser.avatarUrl && <AvatarImage src={getMediaUrl(foundUser.avatarUrl)} />}
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold text-base">
                    {(foundUser.displayName || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-foreground truncate">
                    {foundUser.displayName}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {foundUser.email || foundUser.about || ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!foundUser.isContact && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSaveContact(foundUser.id, foundUser.displayName)}
                    className="h-8 w-8 rounded-lg"
                    title="Add to contacts"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="matrix"
                  size="sm"
                  onClick={() => handleStartChatWithUserId(foundUser.id)}
                  className="h-8 px-3 rounded-lg text-xs"
                >
                  Chat
                </Button>
              </div>
            </div>
          )}

          {/* Saved Contacts Section */}
          <div className="pt-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Saved Contacts
            </h3>

            <ScrollArea className="h-44">
              {loadingContacts ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Loading contacts...
                </div>
              ) : savedContacts.length > 0 ? (
                <div className="space-y-1">
                  {savedContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => handleStartChatWithUserId(contact.id)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/50 cursor-pointer transition select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="w-9 h-9 border border-border">
                          {contact.avatarUrl && <AvatarImage src={getMediaUrl(contact.avatarUrl)} />}
                          <AvatarFallback className="text-xs font-semibold">
                            {(contact.name || 'U')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {contact.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {contact.email || ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-[#00a884] font-semibold">Message</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6 italic">
                  No saved contacts yet. Search an email address above to start a chat!
                </p>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
