import React, { useState, useEffect } from 'react';
import { User, PrivacySettings } from '../../types';
import { api } from '../../services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Combobox } from '../../components/ui/combobox';
import { User as UserIcon, Shield, Check, RefreshCw, Lock, Globe, Users } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserUpdated: () => void;
}

export function ProfileModal({ isOpen, onClose, currentUser, onUserUpdated }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [about, setAbout] = useState(currentUser.about || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    lastSeenVisibility: 'everyone',
    onlineVisibility: 'everyone',
    avatarVisibility: 'everyone',
    aboutVisibility: 'everyone',
    readReceiptsEnabled: true,
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const visibilityOptions = React.useMemo(
    () => [
      {
        value: 'everyone',
        label: 'Everyone',
        icon: <Globe className="w-4 h-4 text-muted-foreground shrink-0" />,
      },
      {
        value: 'contacts',
        label: 'My Contacts',
        icon: <Users className="w-4 h-4 text-muted-foreground shrink-0" />,
      },
      {
        value: 'nobody',
        label: 'Nobody',
        icon: <Lock className="w-4 h-4 text-muted-foreground shrink-0" />,
      },
    ],
    []
  );

  useEffect(() => {
    if (isOpen) {
      loadProfileAndPrivacy();
    }
  }, [isOpen]);

  const loadProfileAndPrivacy = async () => {
    try {
      const data = await api.getMe();
      setDisplayName(data.displayName || '');
      setAbout(data.about || '');
      setAvatarUrl(data.avatarUrl || '');
      if (data.privacySettings) {
        setPrivacy(data.privacySettings);
      }
    } catch (err) {
      console.error('[Load Profile Error]', err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateMe({ displayName, about, avatarUrl });
      onUserUpdated();
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async (field: keyof PrivacySettings, value: any) => {
    try {
      const updated = { ...privacy, [field]: value };
      setPrivacy(updated);
      await api.updatePrivacy(updated);
      setSuccessMsg('Privacy preference saved.');
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to update privacy settings');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-border/50 bg-muted/40">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-[#00a884]" />
            <span>Profile & Settings</span>
          </DialogTitle>
        </DialogHeader>

        {/* Success Alert */}
        {successMsg && (
          <div className="mx-5 mt-4 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Radix Tabs */}
        <div className="p-5">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
            </TabsList>

            {/* Tab 1: Profile Details */}
            <TabsContent value="profile">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Avatar Display */}
                <div className="flex flex-col items-center mb-2">
                  <Avatar className="w-20 h-20 border-2 border-[#00a884] mb-3 shadow-md">
                    {avatarUrl && <AvatarImage src={avatarUrl} />}
                    <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary">
                      {(displayName || 'U')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Input
                    type="url"
                    placeholder="Avatar Image URL (HTTPS)"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Your Name
                  </label>
                  <Input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>

                {/* About */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    About
                  </label>
                  <Input
                    type="text"
                    maxLength={200}
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>

                {/* Phone Number (Read-only primary identity) */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Phone Number (Primary Identity)
                  </label>
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground">
                    <span>{currentUser.phoneNumber}</span>
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="matrix"
                  disabled={saving}
                  className="w-full mt-4"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : 'Save Changes'}
                </Button>
              </form>
            </TabsContent>

            {/* Tab 2: Privacy Settings with Radix Switch & Combobox */}
            <TabsContent value="privacy" className="space-y-4 text-sm">
              {/* Last Seen */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Last Seen Visibility
                </label>
                <Combobox
                  items={visibilityOptions}
                  value={privacy.lastSeenVisibility}
                  onChange={(val) => handleSavePrivacy('lastSeenVisibility', val)}
                  searchPlaceholder="Search visibility option..."
                  className="w-[370px] max-w-[calc(100vw-5rem)]"
                />
              </div>

              {/* Online Status */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Online Status Visibility
                </label>
                <Combobox
                  items={visibilityOptions}
                  value={privacy.onlineVisibility}
                  onChange={(val) => handleSavePrivacy('onlineVisibility', val)}
                  searchPlaceholder="Search visibility option..."
                  className="w-[370px] max-w-[calc(100vw-5rem)]"
                />
              </div>

              {/* Avatar Visibility */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Profile Photo Visibility
                </label>
                <Combobox
                  items={visibilityOptions}
                  value={privacy.avatarVisibility}
                  onChange={(val) => handleSavePrivacy('avatarVisibility', val)}
                  searchPlaceholder="Search visibility option..."
                  className="w-[370px] max-w-[calc(100vw-5rem)]"
                />
              </div>

              {/* Read Receipts with Radix Switch */}
              <div className="pt-3 flex items-center justify-between border-t border-border">
                <div className="pr-4">
                  <p className="font-medium text-xs text-foreground">Read Receipts</p>
                  <p className="text-[11px] text-muted-foreground">
                    If turned off, you won't send or receive read receipts (blue ticks).
                  </p>
                </div>
                <Switch
                  checked={privacy.readReceiptsEnabled}
                  onCheckedChange={(checked) => handleSavePrivacy('readReceiptsEnabled', checked)}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
