import React, { useState } from 'react';
import { Conversation } from '../../types';
import { api } from '../../services/api';
import { modal } from '../../components/ui/modal';
import { formatLastSeen } from '../../utils/formatters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  User,
  Phone,
  Info,
  Clock,
  Pin,
  Volume2,
  VolumeX,
  ShieldAlert,
  Edit2,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

interface ContactInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onBlockUser: () => void;
  onContactUpdated: () => void;
}

export function ContactInfoModal({
  isOpen,
  onClose,
  conversation,
  onTogglePin,
  onToggleMute,
  onBlockUser,
  onContactUpdated,
}: ContactInfoModalProps) {
  const otherUser = conversation?.otherUser;

  const [isEditingName, setIsEditingName] = useState(false);
  const [customName, setCustomName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Sync custom name when modal opens
  React.useEffect(() => {
    if (otherUser) {
      setCustomName(otherUser.name || otherUser.displayName || '');
      setIsEditingName(false);
    }
  }, [otherUser, isOpen]);

  if (!conversation || !otherUser) return null;

  const handleSaveContactName = async () => {
    if (!customName.trim()) return;
    try {
      setSavingName(true);
      await api.saveContact(otherUser.id, customName.trim());
      modal.success('Contact nickname saved in your address book.');
      setIsEditingName(false);
      onContactUpdated();
    } catch (err: any) {
      modal.error(err.message || 'Failed to save contact name');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white dark:bg-[#111b21] border border-border/80 shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-border/50 bg-muted/30">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <User className="w-5 h-5 text-[#00a884]" />
            <span>Contact Info</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Centered Large Avatar & Contact Name */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="w-24 h-24 border-2 border-border shadow-md mb-3">
              {otherUser.avatarUrl && <AvatarImage src={otherUser.avatarUrl} alt={otherUser.name} />}
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-2xl">
                {(otherUser.name || otherUser.displayName || 'M')[0]}
              </AvatarFallback>
            </Avatar>

            {/* Contact Name & Inline Edit */}
            {isEditingName ? (
              <div className="flex items-center gap-1.5 w-full max-w-xs mt-1">
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Set custom name"
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="matrix"
                  disabled={savingName}
                  onClick={handleSaveContactName}
                  className="h-8 w-8 rounded-lg flex-shrink-0"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setCustomName(otherUser.name || '');
                    setIsEditingName(false);
                  }}
                  className="h-8 w-8 rounded-lg flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  {otherUser.name || otherUser.displayName || 'MatrixChat User'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  title="Edit contact name in your address book"
                  className="text-muted-foreground hover:text-[#00a884] p-1 rounded-md transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-0.5">
              {otherUser.isOnline ? (
                <span className="text-[#00a884] font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse inline-block" />
                  Online
                </span>
              ) : (
                formatLastSeen(otherUser.isOnline, otherUser.lastSeenAt)
              )}
            </p>
          </div>

          {/* Details Cards */}
          <div className="space-y-3">
            {/* Phone Number Card */}
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#00a884]/10 text-[#00a884] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Phone Number
                </span>
                <p className="text-sm font-medium text-foreground tracking-wide mt-0.5 select-all">
                  {otherUser.phoneNumber || 'Protected by privacy settings'}
                </p>
              </div>
            </div>

            {/* About / Status Card */}
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  About
                </span>
                <p className="text-sm text-foreground mt-0.5 leading-relaxed">
                  {otherUser.about || 'Hey there! I am using MatrixChat.'}
                </p>
              </div>
            </div>

            {/* Last Seen Status Card */}
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Last Activity
                </span>
                <p className="text-sm text-foreground mt-0.5">
                  {otherUser.isOnline
                    ? 'Currently active on MatrixChat'
                    : formatLastSeen(otherUser.isOnline, otherUser.lastSeenAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Chat Actions */}
          <div className="pt-2 border-t border-border/40 space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block px-1">
              Chat Options
            </span>

            {/* Pin Toggle */}
            <button
              type="button"
              onClick={onTogglePin}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Pin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {conversation.isPinned ? 'Unpin Conversation' : 'Pin Conversation'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {conversation.isPinned ? 'Pinned' : 'Not pinned'}
              </span>
            </button>

            {/* Mute Toggle */}
            <button
              type="button"
              onClick={onToggleMute}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {conversation.isMuted ? (
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">
                  {conversation.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {conversation.isMuted ? 'Muted' : 'Unmuted'}
              </span>
            </button>

            {/* Block Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onBlockUser();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-destructive/10 hover:bg-destructive/15 text-destructive transition-colors text-left font-medium text-sm mt-3"
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>Block {otherUser.name || 'Contact'}</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
