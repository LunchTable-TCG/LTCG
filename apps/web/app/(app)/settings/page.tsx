"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletConnect } from "@/components/wallet";
import { useGameWallet, useTokenBalance } from "@/hooks";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Bell,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Gamepad2,
  Loader2,
  Mail,
  Palette,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Trash2,
  User,
  Volume2,
  VolumeX,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type SettingsTab = "account" | "wallet" | "notifications" | "display" | "game" | "privacy";

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function Toggle({ enabled, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={cn(
        "relative w-12 h-6 rounded-full transition-colors",
        enabled ? "bg-[#d4af37]" : "bg-[#3d2b1f]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div
        className={cn(
          "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
          enabled ? "translate-x-7" : "translate-x-1"
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { isAuthenticated } = useAuth();
  const currentUser = useConvexQuery(typedApi.core.users.currentUser, isAuthenticated ? {} : "skip");
  const preferences = useConvexQuery(
    typedApi.core.userPreferences.getPreferences,
    isAuthenticated ? {} : "skip"
  );

  const updatePreferences = useConvexMutation(typedApi.core.userPreferences.updatePreferences);
  const updateUsername = useConvexMutation(typedApi.core.userPreferences.updateUsername);
  const updateBio = useConvexMutation(typedApi.core.userPreferences.updateBio);
  const deleteAccount = useConvexMutation(typedApi.core.userPreferences.deleteAccount);

  // Wallet hooks
  const {
    walletAddress,
    walletType,
    isConnected,
    disconnectWallet,
    isLoading: walletLoading,
  } = useGameWallet();
  const {
    balance: tokenBalance,
    isStale,
    refresh: refreshBalance,
    isRefreshing,
    lastVerifiedAt,
  } = useTokenBalance();

  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showWalletConnect, setShowWalletConnect] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // Account settings
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");

  // Account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Notification settings
  const [notifications, setNotifications] = useState({
    questComplete: true,
    matchInvites: true,
    friendRequests: true,
    marketplaceSales: true,
    dailyReminders: false,
    promotions: false,
  });

  // Display settings
  const [display, setDisplay] = useState({
    animations: true,
    reducedMotion: false,
    cardQuality: "high" as "low" | "medium" | "high",
    showDamageNumbers: true,
  });

  // Game settings
  const [game, setGame] = useState({
    soundEnabled: true,
    musicEnabled: true,
    soundVolume: 80,
    musicVolume: 60,
    autoEndTurn: false,
    confirmActions: true,
    showTutorialHints: true,
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showOnlineStatus: true,
    allowFriendRequests: true,
    showMatchHistory: true,
  });

  // Track if settings have been modified (dirty state)
  const [isDirty, setIsDirty] = useState(false);

  // Load preferences when they're available
  useEffect(() => {
    if (preferences) {
      setNotifications(preferences.notifications);
      setDisplay(preferences.display);
      setGame(preferences.game);
      setPrivacy(preferences.privacy);
    }
  }, [preferences]);

  // Track dirty state when settings change
  useEffect(() => {
    if (!preferences) return;
    const hasChanges =
      JSON.stringify(notifications) !== JSON.stringify(preferences.notifications) ||
      JSON.stringify(display) !== JSON.stringify(preferences.display) ||
      JSON.stringify(game) !== JSON.stringify(preferences.game) ||
      JSON.stringify(privacy) !== JSON.stringify(preferences.privacy) ||
      username !== (currentUser?.username || "") ||
      bio !== (currentUser?.bio || "");
    setIsDirty(hasChanges);
  }, [
    notifications,
    display,
    game,
    privacy,
    username,
    bio,
    preferences,
    currentUser?.username,
    currentUser?.bio,
  ]);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Load current user data
  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || "");
      setEmail(currentUser.email || "");
      setBio(currentUser.bio || "");
    }
  }, [currentUser]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save username if changed
      if (username !== currentUser?.username) {
        const result = await updateUsername({ username });
        if (!result.success) {
          toast.error(result.error || "Failed to update username");
          setIsSaving(false);
          return;
        }
      }

      // Save bio if changed
      if (bio !== (currentUser?.bio || "")) {
        await updateBio({ bio });
      }

      // Save preferences
      await updatePreferences({
        notifications,
        display,
        game,
        privacy,
      });

      setSaveSuccess(true);
      toast.success("Settings saved successfully");
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      toast.error("Failed to save settings");
      console.error("Save settings error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnectWallet();
      setShowDisconnectConfirm(false);
      toast.success("Wallet disconnected");
    } catch (error) {
      toast.error("Failed to disconnect wallet");
      console.error("Wallet disconnect error:", error);
    }
  };

  const copyWalletAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast.success("Wallet address copied");
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmPassword) {
      toast.error("Please enter your password to confirm");
      return;
    }

    setIsDeletingAccount(true);
    try {
      const result = await deleteAccount({
        confirmPassword: deleteConfirmPassword,
      });

      if (result.success) {
        toast.success("Account deleted successfully");
        // User will be redirected to login by auth system
      } else {
        toast.error(result.error || "Failed to delete account");
        setIsDeletingAccount(false);
      }
    } catch (error) {
      toast.error("Failed to delete account");
      console.error("Account deletion error:", error);
      setIsDeletingAccount(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: typeof Settings }[] = [
    { id: "account", label: "Account", icon: User },
    { id: "wallet", label: "Wallet", icon: Wallet },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "display", label: "Display", icon: Palette },
    { id: "game", label: "Game", icon: Gamepad2 },
    { id: "privacy", label: "Privacy", icon: Shield },
  ];

  if (!isAuthenticated || !currentUser || preferences === undefined) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-purple-900/10 via-[#0d0a09] to-[#0d0a09]" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-[#d4af37]" />
            <h1 className="text-3xl font-bold text-[#e8e0d5]">Settings</h1>
          </div>
          <p className="text-[#a89f94]">Manage your account and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile Tabs - Horizontal Scroll */}
          <div className="lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 px-1 -mx-1 hide-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap",
                      isActive
                        ? "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/50"
                        : "bg-black/40 border border-[#3d2b1f] text-[#a89f94]"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Sidebar Navigation */}
          <div className="hidden lg:block lg:w-64 shrink-0">
            <nav className="p-2 rounded-xl bg-black/40 border border-[#3d2b1f]">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left",
                      isActive
                        ? "bg-[#d4af37]/20 text-[#d4af37]"
                        : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 ml-auto transition-transform",
                        isActive && "rotate-90"
                      )}
                    />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="flex-1">
            <div className="p-6 rounded-xl bg-black/40 border border-[#3d2b1f]">
              {/* Account Settings */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#e8e0d5] mb-4">Account Settings</h2>
                    <p className="text-[#a89f94] text-sm mb-6">
                      Manage your account information and security
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="settings-username"
                        className="block text-sm font-medium text-[#a89f94] mb-2"
                      >
                        Username
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94]" />
                        <Input
                          id="settings-username"
                          value={username || currentUser?.username || ""}
                          onChange={(e) => setUsername(e.target.value)}
                          className="pl-10 bg-black/40 border-[#3d2b1f] text-[#e8e0d5]"
                          placeholder="Your username"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="settings-email"
                        className="block text-sm font-medium text-[#a89f94] mb-2"
                      >
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94]" />
                        <Input
                          id="settings-email"
                          type="email"
                          value={email}
                          readOnly
                          className="pl-10 bg-black/40 border-[#3d2b1f] text-[#a89f94] cursor-not-allowed"
                          placeholder="your@email.com"
                        />
                      </div>
                      <p className="text-xs text-[#a89f94]/60 mt-1">
                        Email is managed by your authentication provider
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="settings-bio"
                        className="block text-sm font-medium text-[#a89f94] mb-2"
                      >
                        Bio
                      </label>
                      <textarea
                        id="settings-bio"
                        value={bio}
                        onChange={(e) => {
                          if (e.target.value.length <= 200) {
                            setBio(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 bg-black/40 border border-[#3d2b1f] rounded-md text-[#e8e0d5] placeholder:text-[#a89f94]/50 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 resize-none"
                        placeholder="Tell others about yourself..."
                        rows={3}
                      />
                      <p className="text-xs text-[#a89f94]/60 mt-1 text-right">
                        {bio.length}/200 characters
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#3d2b1f]">
                      <h3 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>

                      {!showDeleteConfirm ? (
                        <>
                          <Button
                            variant="outline"
                            className="w-full justify-start border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => setShowDeleteConfirm(true)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Account
                          </Button>
                          <p className="text-xs text-[#a89f94] mt-2">
                            This action is irreversible. All your data will be permanently deleted.
                          </p>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <p className="text-sm text-red-400 mb-3">
                              <strong>Warning:</strong> This will permanently delete your account
                              and all associated data including:
                            </p>
                            <ul className="text-xs text-red-400/80 space-y-1 ml-4 list-disc">
                              <li>All your cards and decks</li>
                              <li>Story progress and achievements</li>
                              <li>Match history and statistics</li>
                              <li>Friend connections</li>
                              <li>All purchases and gold</li>
                            </ul>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-[#a89f94] mb-2">
                              Enter your password to confirm deletion
                            </label>
                            <Input
                              type="password"
                              value={deleteConfirmPassword}
                              onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                              className="bg-black/40 border-red-500/30 text-[#e8e0d5]"
                              placeholder="Enter your password"
                              disabled={isDeletingAccount}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              onClick={handleDeleteAccount}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                              disabled={isDeletingAccount || !deleteConfirmPassword}
                            >
                              {isDeletingAccount ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete My Account
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeleteConfirmPassword("");
                              }}
                              disabled={isDeletingAccount}
                              className="border-[#3d2b1f] text-[#a89f94]"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Wallet Settings */}
              {activeTab === "wallet" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#e8e0d5] mb-4">Wallet & Security</h2>
                    <p className="text-[#a89f94] text-sm mb-6">
                      Manage your connected wallet and token balance
                    </p>
                  </div>

                  {isConnected && walletAddress ? (
                    <div className="space-y-6">
                      {/* Connected Wallet Card */}
                      <div className="p-4 rounded-lg bg-black/20 border border-[#d4af37]/30">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-[#d4af37]/20 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-[#d4af37]" />
                          </div>
                          <div>
                            <p className="font-medium text-[#e8e0d5]">
                              {walletType === "privy_embedded"
                                ? "Game Wallet (Privy)"
                                : "External Wallet"}
                            </p>
                            <p className="text-xs text-[#a89f94]">Connected</p>
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-xs text-green-400">Active</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-black/40 rounded-lg">
                          <code className="flex-1 text-sm text-[#a89f94] font-mono">
                            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={copyWalletAddress}
                            className="text-[#a89f94] hover:text-[#e8e0d5]"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Token Balance */}
                      <div className="p-4 rounded-lg bg-black/20 border border-[#3d2b1f]">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-medium text-[#e8e0d5]">Token Balance</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={refreshBalance}
                            disabled={isRefreshing}
                            className="text-[#a89f94] hover:text-[#e8e0d5]"
                          >
                            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                          </Button>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-[#d4af37]">
                            {tokenBalance !== null ? tokenBalance.toLocaleString() : "---"}
                          </span>
                          <span className="text-sm text-[#a89f94]">LTCG</span>
                        </div>
                        {isStale && (
                          <p className="text-xs text-yellow-400/70 mt-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Balance may be outdated
                          </p>
                        )}
                        {lastVerifiedAt && (
                          <p className="text-xs text-[#a89f94]/60 mt-1">
                            Last updated: {new Date(lastVerifiedAt).toLocaleString()}
                          </p>
                        )}
                      </div>

                      {/* Transaction History Link */}
                      <Link
                        href="/lunchmoney?tab=transactions"
                        className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-[#3d2b1f] hover:border-[#d4af37]/50 transition-colors group"
                      >
                        <div>
                          <p className="font-medium text-[#e8e0d5]">Transaction History</p>
                          <p className="text-sm text-[#a89f94]">View all token transactions</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-[#a89f94] group-hover:text-[#d4af37] transition-colors" />
                      </Link>

                      {/* Disconnect Button */}
                      <div className="pt-4 border-t border-[#3d2b1f]">
                        {!showDisconnectConfirm ? (
                          <Button
                            variant="outline"
                            className="w-full justify-center border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => setShowDisconnectConfirm(true)}
                          >
                            Disconnect Wallet
                          </Button>
                        ) : (
                          <div className="space-y-3">
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                              <p className="text-sm text-red-400">
                                Are you sure you want to disconnect your wallet? You won&apos;t be
                                able to trade tokens until you reconnect.
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={handleDisconnectWallet}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                disabled={walletLoading}
                              >
                                {walletLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Disconnect"
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setShowDisconnectConfirm(false)}
                                className="border-[#3d2b1f] text-[#a89f94]"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-[#3d2b1f] flex items-center justify-center mx-auto mb-4">
                        <Wallet className="w-8 h-8 text-[#a89f94]" />
                      </div>
                      <h3 className="text-lg font-medium text-[#e8e0d5] mb-2">
                        No Wallet Connected
                      </h3>
                      <p className="text-[#a89f94] text-sm mb-6 max-w-sm mx-auto">
                        Connect a wallet to trade cards for LTCG tokens and access the token
                        marketplace.
                      </p>
                      <Button
                        onClick={() => setShowWalletConnect(true)}
                        className="bg-[#d4af37] hover:bg-[#c49d2e] text-black"
                      >
                        <Wallet className="w-4 h-4 mr-2" />
                        Connect Wallet
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Wallet Connect Dialog */}
              <WalletConnect open={showWalletConnect} onOpenChange={setShowWalletConnect} />

              {/* Notification Settings */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#e8e0d5] mb-4">Notification Settings</h2>
                    <p className="text-[#a89f94] text-sm mb-6">
                      Choose what notifications you want to receive
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        key: "questComplete",
                        label: "Quest Completed",
                        description: "Get notified when you complete a quest",
                      },
                      {
                        key: "matchInvites",
                        label: "Match Invites",
                        description: "Receive notifications for match invitations",
                      },
                      {
                        key: "friendRequests",
                        label: "Friend Requests",
                        description: "Be notified of new friend requests",
                      },
                      {
                        key: "marketplaceSales",
                        label: "Marketplace Sales",
                        description: "Get alerts when your cards sell",
                      },
                      {
                        key: "dailyReminders",
                        label: "Daily Reminders",
                        description: "Remind me to complete daily quests",
                      },
                      {
                        key: "promotions",
                        label: "Promotions & Updates",
                        description: "Receive news about events and updates",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-[#3d2b1f]"
                      >
                        <div>
                          <p className="font-medium text-[#e8e0d5]">{item.label}</p>
                          <p className="text-sm text-[#a89f94]">{item.description}</p>
                        </div>
                        <Toggle
                          enabled={notifications[item.key as keyof typeof notifications]}
                          onChange={(enabled) =>
                            setNotifications({ ...notifications, [item.key]: enabled })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Display Settings */}
              {activeTab === "display" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#e8e0d5] mb-4">Display Settings</h2>
                    <p className="text-[#a89f94] text-sm mb-6">Customize visual preferences</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-[#3d2b1f]">
                      <div>
                        <p className="font-medium text-[#e8e0d5]">Enable Animations</p>
                        <p className="text-sm text-[#a89f94]">
                          Show card flip and battle animations
                        </p>
                      </div>
                      <Toggle
                        enabled={display.animations}
                        onChange={(enabled) => setDisplay({ ...display, animations: enabled })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-[#3d2b1f]">
                      <div>
                        <p className="font-medium text-[#e8e0d5]">Reduced Motion</p>
                        <p className="text-sm text-[#a89f94]">Minimize motion for accessibility</p>
                      </div>
                      <Toggle
                        enabled={display.reducedMotion}
                        onChange={(enabled) => setDisplay({ ...display, reducedMotion: enabled })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-[#3d2b1f]">
                      <div>
                        <p className="font-medium text-[#e8e0d5]">Show Damage Numbers</p>
                        <p className="text-sm text-[#a89f94]">
                          Display floating damage numbers in battle
                        </p>
                      </div>
                      <Toggle
                        enabled={display.showDamageNumbers}
                        onChange={(enabled) =>
                          setDisplay({ ...display, showDamageNumbers: enabled })
                        }
                      />
                    </div>

                    <div className="p-4 rounded-lg bg-black/20 border border-[#3d2b1f]">
                      <p className="font-medium text-[#e8e0d5] mb-3">Card Quality</p>
                      <div className="flex gap-2">
                        {(["low", "medium", "high"] as const).map((quality) => (
                          <button
                            type="button"
                            key={quality}
                            onClick={() => setDisplay({ ...display, cardQuality: quality })}
                            className={cn(
                              "flex-1 py-2 px-4 rounded-lg font-medium transition-all capitalize",
                              display.cardQuality === quality
                                ? "bg-[#d4af37] text-[#1a1614]"
                                : "bg-black/40 text-[#a89f94] hover:text-[#e8e0d5]"
                            )}
                          >
                            {quality}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Game Settings */}
              {activeTab === "game" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#e8e0d5] mb-4">Game Settings</h2>
                    <p className="text-[#a89f94] text-sm mb-6">
                      Customize your gameplay experience
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Sound Settings */}
                    <div className="p-4 rounded-lg bg-black/20 border border-[#3d2b1f]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {game.soundEnabled ? (
                            <Volume2 className="w-5 h-5 text-[#d4af37]" />
                          ) : (
                            <VolumeX className="w-5 h-5 text-[#a89f94]" />
                          )}
                          <p className="font-medium text-[#e8e0d5]">Sound Effects</p>
                        </div>
                        <Toggle
                          enabled={game.soundEnabled}
                          onChange={(enabled) => setGame({ ...game, soundEnabled: enabled })}
                        />
                      </div>
                      {game.soundEnabled && (
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={game.soundVolume}
                          onChange={(e) =>
                            setGame({ ...game, soundVolume: Number.parseInt(e.target.value, 10) })
                          }
                          className="w-full accent-[#d4af37]"
                        />
                      )}
                    </div>

                    <div className="p-4 rounded-lg bg-black/20 border border-[#3d2b1f]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {game.musicEnabled ? (
                            <Volume2 className="w-5 h-5 text-[#d4af37]" />
                          ) : (
                            <VolumeX className="w-5 h-5 text-[#a89f94]" />
                          )}
                          <p className="font-medium text-[#e8e0d5]">Music</p>
                        </div>
                        <Toggle
                          enabled={game.musicEnabled}
                          onChange={(enabled) => setGame({ ...game, musicEnabled: enabled })}
                        />
                      </div>
                      {game.musicEnabled && (
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={game.musicVolume}
                          onChange={(e) =>
                            setGame({ ...game, musicVolume: Number.parseInt(e.target.value, 10) })
                          }
                          className="w-full accent-[#d4af37]"
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-[#3d2b1f]">
                      <div>
                        <p className="font-medium text-[#e8e0d5]">Auto End Turn</p>
                        <p className="text-sm text-[#a89f94]">
                          Automatically end turn when no actions available
                        </p>
                      </div>
                      <Toggle
                        enabled={game.autoEndTurn}
                        onChange={(enabled) => setGame({ ...game, autoEndTurn: enabled })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-[#3d2b1f]">
                      <div>
                        <p className="font-medium text-[#e8e0d5]">Confirm Actions</p>
                        <p className="text-sm text-[#a89f94]">
                          Ask for confirmation before important actions
                        </p>
                      </div>
                      <Toggle
                        enabled={game.confirmActions}
                        onChange={(enabled) => setGame({ ...game, confirmActions: enabled })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-[#3d2b1f]">
                      <div>
                        <p className="font-medium text-[#e8e0d5]">Tutorial Hints</p>
                        <p className="text-sm text-[#a89f94]">Show helpful tips during gameplay</p>
                      </div>
                      <Toggle
                        enabled={game.showTutorialHints}
                        onChange={(enabled) => setGame({ ...game, showTutorialHints: enabled })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Settings */}
              {activeTab === "privacy" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#e8e0d5] mb-4">Privacy Settings</h2>
                    <p className="text-[#a89f94] text-sm mb-6">
                      Control who can see your information
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-[#3d2b1f]">
                      <div className="flex items-center gap-3">
                        {privacy.profilePublic ? (
                          <Eye className="w-5 h-5 text-[#d4af37]" />
                        ) : (
                          <EyeOff className="w-5 h-5 text-[#a89f94]" />
                        )}
                        <div>
                          <p className="font-medium text-[#e8e0d5]">Public Profile</p>
                          <p className="text-sm text-[#a89f94]">
                            Allow others to view your profile
                          </p>
                        </div>
                      </div>
                      <Toggle
                        enabled={privacy.profilePublic}
                        onChange={(enabled) => setPrivacy({ ...privacy, profilePublic: enabled })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-[#3d2b1f]">
                      <div>
                        <p className="font-medium text-[#e8e0d5]">Show Online Status</p>
                        <p className="text-sm text-[#a89f94]">
                          Let others see when you&apos;re online
                        </p>
                      </div>
                      <Toggle
                        enabled={privacy.showOnlineStatus}
                        onChange={(enabled) =>
                          setPrivacy({ ...privacy, showOnlineStatus: enabled })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-[#3d2b1f]">
                      <div>
                        <p className="font-medium text-[#e8e0d5]">Allow Friend Requests</p>
                        <p className="text-sm text-[#a89f94]">
                          Receive friend requests from other players
                        </p>
                      </div>
                      <Toggle
                        enabled={privacy.allowFriendRequests}
                        onChange={(enabled) =>
                          setPrivacy({ ...privacy, allowFriendRequests: enabled })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-[#3d2b1f]">
                      <div>
                        <p className="font-medium text-[#e8e0d5]">Show Match History</p>
                        <p className="text-sm text-[#a89f94]">
                          Make your match history visible to others
                        </p>
                      </div>
                      <Toggle
                        enabled={privacy.showMatchHistory}
                        onChange={(enabled) =>
                          setPrivacy({ ...privacy, showMatchHistory: enabled })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-[#3d2b1f] flex items-center justify-end gap-4">
                {isDirty && !saveSuccess && (
                  <span className="flex items-center gap-2 text-yellow-400 text-sm">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    Unsaved changes
                  </span>
                )}
                {saveSuccess && (
                  <span className="flex items-center gap-2 text-green-400 text-sm">
                    <Check className="w-4 h-4" />
                    Settings saved
                  </span>
                )}
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614] font-bold px-8"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
