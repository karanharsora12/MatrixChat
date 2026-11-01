import React, { useState, useEffect } from 'react';
import { User, PrivacySettings } from '../../types';
import { api, getMediaUrl } from '../../services/api';
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
import { modal } from '../../components/ui/modal';
import { OtpInput } from '../auth/OtpInput';
import {
  User as UserIcon,
  ShieldCheck,
  Check,
  RefreshCw,
  Lock,
  Globe,
  Users,
  QrCode,
  Copy,
  Key,
} from 'lucide-react';

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

  // 2FA / TOTP Authenticator States
  const [totpEnabled, setTotpEnabled] = useState(Boolean(currentUser.totpEnabled));
  const [settingUpTotp, setSettingUpTotp] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<{
    secret: string;
    qrCodeUrl: string;
    email: string;
  } | null>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

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
      setTotpEnabled(Boolean(currentUser.totpEnabled));
    }
  }, [isOpen, currentUser.totpEnabled]);

  const loadProfileAndPrivacy = async () => {
    try {
      const data = await api.getMe();
      setDisplayName(data.displayName || '');
      setAbout(data.about || '');
      setAvatarUrl(data.avatarUrl || '');
      if (data.totpEnabled !== undefined) {
        setTotpEnabled(Boolean(data.totpEnabled));
      }
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
      modal.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async (field: keyof PrivacySettings, value: any) => {
    try {
      const updated = { ...privacy, [field]: value };
      setPrivacy(updated);
      await api.updatePrivacy(updated);
      onUserUpdated();
    } catch (err: any) {
      modal.error(err.message || 'Failed to update privacy setting');
    }
  };

  const handleStartTotpSetup = async () => {
    try {
      setTotpLoading(true);
      const data = await api.setupTotp();
      setTotpSetupData(data);
      setSettingUpTotp(true);
      setTotpVerifyCode('');
    } catch (err: any) {
      modal.error(err.message || 'Failed to initialize Authenticator setup.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleVerifyAndEnableTotp = async () => {
    if (totpVerifyCode.length !== 6) {
      modal.error('Please enter the full 6-digit code from your authenticator app.');
      return;
    }

    try {
      setTotpLoading(true);
      await api.verifyTotpSetup(totpVerifyCode);
      setTotpEnabled(true);
      setSettingUpTotp(false);
      setTotpSetupData(null);
      setTotpVerifyCode('');
      setSuccessMsg('Authenticator App (2FA) enabled successfully!');
      onUserUpdated();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      modal.error(err.message || 'Invalid 6-digit code. Please check your app and try again.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleDisableTotp = async () => {
    const confirmed = await modal.confirm({
      title: 'Disable Authenticator App (2FA)?',
      message:
        'Are you sure you want to disable two-factor authentication? Your account will only be protected by email verification codes.',
      confirmText: 'Disable 2FA',
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      setTotpLoading(true);
      await api.disableTotp();
      setTotpEnabled(false);
      setSettingUpTotp(false);
      setTotpSetupData(null);
      setSuccessMsg('Authenticator App has been disabled.');
      onUserUpdated();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      modal.error(err.message || 'Failed to disable 2FA.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (totpSetupData?.secret) {
      navigator.clipboard.writeText(totpSetupData.secret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[440px] w-full p-0 overflow-hidden max-h-[85vh] flex flex-col rounded-2xl border border-border shadow-2xl bg-card">
        {/* Fixed Header */}
        <DialogHeader className="px-5 py-4 border-b border-border/50 bg-muted/30 shrink-0">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-[#00a884]" />
            <span>My Profile & Settings</span>
          </DialogTitle>
        </DialogHeader>

        {/* Success Alert */}
        {successMsg && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 shrink-0 animate-in fade-in-0">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Radix Tabs Root with Flex Column */}
        <Tabs defaultValue="profile" className="flex flex-col flex-1 min-h-0">
          {/* Fixed Tabs Bar */}
          <div className="px-5 pt-3.5 pb-2 shrink-0 border-b border-border/40 bg-card">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
          </div>

          {/* ================= TAB 1: PROFILE DETAILS ================= */}
          <TabsContent value="profile" className="flex-1 overflow-y-auto px-5 py-4 m-0 min-h-0 space-y-4">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Display */}
              <div className="flex flex-col items-center mb-2">
                <Avatar className="w-20 h-20 border-2 border-[#00a884] mb-3 shadow-md">
                  {avatarUrl && <AvatarImage src={getMediaUrl(avatarUrl)} />}
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

              {/* Email Address (Read-only primary identity) */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Email Address (Primary Identity)
                </label>
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground">
                  <span>{currentUser.email || currentUser.phoneNumber || 'Not configured'}</span>
                  <Lock className="w-3.5 h-3.5" />
                </div>
              </div>

              <Button
                type="submit"
                variant="matrix"
                disabled={saving}
                className="w-full mt-4 cursor-pointer"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : 'Save Changes'}
              </Button>
            </form>
          </TabsContent>

          {/* ================= TAB 2: PRIVACY SETTINGS ================= */}
          <TabsContent value="privacy" className="flex-1 overflow-y-auto px-5 py-4 m-0 min-h-0 space-y-4 text-sm">
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

          {/* ================= TAB 3: SECURITY & AUTHENTICATOR APP ================= */}
          <TabsContent value="security" className="flex flex-col flex-1 min-h-0 m-0">
            {totpEnabled && !settingUpTotp ? (
              <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 space-y-3">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">
                        Authenticator App (2FA) is Active
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your account is secured with Google Authenticator or Microsoft Authenticator.
                        You can sign in instantly using rolling 6-digit codes without waiting for emails.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-500/20 flex justify-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={totpLoading}
                      onClick={handleDisableTotp}
                      className="text-xs h-8 cursor-pointer"
                    >
                      {totpLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : null}
                      Disable Authenticator 2FA
                    </Button>
                  </div>
                </div>
              </div>
            ) : settingUpTotp && totpSetupData ? (
              <>
                {/* Scrollable Setup Body: QR Code, Secret Key, OTP inputs */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 min-h-0">
                  <div className="text-center space-y-0.5">
                    <h4 className="font-semibold text-foreground text-sm">Scan QR Code</h4>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Open Google Authenticator or Microsoft Authenticator, tap{' '}
                      <span className="font-semibold text-foreground">+</span>, and scan this code:
                    </p>
                  </div>

                  {/* QR Code Container - Well proportioned */}
                  <div className="flex justify-center p-2.5 bg-white rounded-xl shadow-xs border border-border w-fit mx-auto">
                    <img
                      src={totpSetupData.qrCodeUrl}
                      alt="Authenticator QR Code"
                      className="w-36 h-36 object-contain"
                    />
                  </div>

                  {/* Manual Key Box */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/60 border border-border text-xs">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="font-mono text-[11px] font-medium text-foreground truncate select-all">
                        {totpSetupData.secret}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="text-xs font-semibold text-[#00a884] hover:underline flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-md hover:bg-[#00a884]/10 transition cursor-pointer"
                    >
                      {copiedKey ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Verification Code Section */}
                  <div className="space-y-2 pt-1 pb-2">
                    <label className="block text-xs font-semibold text-foreground">
                      Enter the 6-digit code shown in your app to activate:
                    </label>
                    <OtpInput
                      length={6}
                      value={totpVerifyCode}
                      onChange={setTotpVerifyCode}
                      onComplete={handleVerifyAndEnableTotp}
                      disabled={totpLoading}
                    />
                  </div>
                </div>

                {/* Fixed Non-Overlapping Actions Footer */}
                <div className="shrink-0 px-5 py-3 border-t border-border bg-muted/20 flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-10 text-xs font-semibold cursor-pointer"
                    onClick={() => {
                      setSettingUpTotp(false);
                      setTotpSetupData(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="matrix"
                    disabled={totpLoading || totpVerifyCode.length !== 6}
                    onClick={handleVerifyAndEnableTotp}
                    className="flex-1 h-10 text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {totpLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : null}
                    Activate
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
                <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#00a884]/15 text-[#00a884] flex items-center justify-center shrink-0 mt-0.5">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-foreground text-sm">
                        Google / Microsoft Authenticator
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Log in faster and more securely by scanning a QR code once. You can sign in using
                        rolling 6-digit verification codes generated on your phone app.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="matrix"
                    onClick={handleStartTotpSetup}
                    disabled={totpLoading}
                    className="w-full text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {totpLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <QrCode className="w-4 h-4" />
                    )}
                    <span>Set up Authenticator App (QR Code)</span>
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
