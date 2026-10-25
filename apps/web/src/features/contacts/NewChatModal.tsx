import React, { useState, useEffect } from 'react';
import { COUNTRIES, CountryCode } from '../../utils/countries';
import { Contact, Conversation } from '../../types';
import { api } from '../../services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Combobox } from '../../components/ui/combobox';
import { Search, UserPlus, MessageSquare, RefreshCw, Globe } from 'lucide-react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conv: Conversation) => void;
}

export function NewChatModal({ isOpen, onClose, onSelectConversation }: NewChatModalProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [foundUser, setFoundUser] = useState<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
    about: string | null;
    isContact: boolean;
    customName: string | null;
    phoneNumber: string;
  } | null>(null);

  const [savedContacts, setSavedContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const countryItems = React.useMemo(
    () =>
      COUNTRIES.map((c) => ({
        value: c.code,
        label: `${c.name} (${c.dialCode})`,
        icon: <Globe className="w-4 h-4 text-muted-foreground shrink-0" />,
      })),
    []
  );

  useEffect(() => {
    if (isOpen) {
      loadSavedContacts();
      setFoundUser(null);
      setError(null);
      setPhoneNumber('');
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

    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 7) {
      setError('Please enter at least 7 digits.');
      return;
    }

    try {
      setLoading(true);
      const queryPhone = `${selectedCountry.dialCode}${cleaned}`;
      const user = await api.searchContact(queryPhone);
      setFoundUser(user);
    } catch (err: any) {
      setError(err.message || 'No user found with this phone number.');
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
      setError(err.message || 'Failed to start conversation.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async (targetUserId: string, name: string) => {
    try {
      await api.saveContact(targetUserId, name);
      await loadSavedContacts();
      if (foundUser) {
        setFoundUser({ ...foundUser, isContact: true });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save contact');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-border/50 bg-muted/40">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <MessageSquare className="w-5 h-5 text-[#00a884]" />
            <span>New Chat</span>
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Search by phone number */}
          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Country
              </label>
              <Combobox
                items={countryItems}
                value={selectedCountry.code}
                onChange={(code) => {
                  const c = COUNTRIES.find((x) => x.code === code);
                  if (c) setSelectedCountry(c);
                }}
                searchPlaceholder="Search country or code..."
                placeholder="Select country"
                triggerClassName="w-full h-11"
                className="w-[370px] max-w-[calc(100vw-5rem)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <div className="flex rounded-xl border border-input overflow-hidden bg-background focus-within:ring-1 focus-within:ring-[#00a884]">
                <div className="px-3.5 py-2.5 text-[#00a884] font-medium bg-muted/40 border-r border-input text-xs select-none flex items-center">
                  {selectedCountry.dialCode}
                </div>
                <input
                  type="tel"
                  placeholder="e.g. 555-0102"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 px-3 py-2 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <Button
                  type="submit"
                  variant="matrix"
                  disabled={loading || !phoneNumber.trim()}
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
                  {foundUser.avatarUrl && <AvatarImage src={foundUser.avatarUrl} />}
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold text-base">
                    {foundUser.displayName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-foreground truncate">
                    {foundUser.displayName}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {foundUser.about || foundUser.phoneNumber}
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
                          {contact.avatarUrl && <AvatarImage src={contact.avatarUrl} />}
                          <AvatarFallback className="text-xs font-semibold">
                            {contact.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {contact.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {contact.phoneNumber}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-[#00a884] font-semibold">Message</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6 italic">
                  No saved contacts yet. Search a number above to start a chat!
                </p>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
