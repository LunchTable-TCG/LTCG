"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  Bell,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Gamepad2,
  Loader2,
  Lock,
  Mail,
  Palette,
  Save,
  Settings,
  Shield,
  Trash2,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type SettingsTab = "account" | "notifications" | "display" | "game" | "privacy";

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
  const currentUser = useQuery(api.core.users.currentUser, isAuthenticated ? {} : "skip");
  const preferences = useQuery(
    api.core.userPreferences.getPreferences,
    isAuthenticated ? {} : "skip"
  );

  const updatePreferences = useMutation(api.core.userPreferences.updatePreferences);
  const updateUsername = useMutation(api.core.userPreferences.updateUsername);
  const changePassword = useMutation(api.core.userPreferences.changePassword);
  const deleteAccount = useMutation(api.core.userPreferences.deleteAccount);

  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Account settings
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  // Load preferences when they're available
  useEffect(() => {
    if (preferences) {
      setNotifications(preferences.notifications);
      setDisplay(preferences.display);
      setGame(preferences.game);
      setPrivacy(preferences.privacy);
    }
  }, [preferences]);

  // Load current user data
  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || "");
      setEmail(currentUser.email || "");
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
      });

      if (result.success) {
        toast.success("Password changed successfully. Please log in again.");
        setShowPasswordChange(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        // User will be logged out automatically due to session invalidation
      } else {
        toast.error(result.error || "Failed to change password");
      }
    } catch (error) {
      toast.error("Failed to change password");
      console.error("Password change error:", error);
    } finally {
      setIsChangingPassword(false);
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
          {/* Sidebar Navigation */}
          <div className="lg:w-64 shrink-0">
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
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 bg-black/40 border-[#3d2b1f] text-[#e8e0d5]"
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#3d2b1f]">
                      <h3 className="text-lg font-semibold text-[#e8e0d5] mb-4">Security</h3>

                      {!showPasswordChange ? (
                        <Button
                          variant="outline"
                          className="w-full justify-start border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5]"
                          onClick={() => setShowPasswordChange(true)}
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Change Password
                        </Button>
                      ) : (
                        <form onSubmit={handleChangePassword} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-[#a89f94] mb-2">
                              Current Password
                            </label>
                            <Input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="bg-black/40 border-[#3d2b1f] text-[#e8e0d5]"
                              placeholder="Enter current password"
                              disabled={isChangingPassword}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-[#a89f94] mb-2">
                              New Password
                            </label>
                            <Input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="bg-black/40 border-[#3d2b1f] text-[#e8e0d5]"
                              placeholder="Enter new password (min 8 characters)"
                              disabled={isChangingPassword}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-[#a89f94] mb-2">
                              Confirm New Password
                            </label>
                            <Input
                              type="password"
                              value={confirmNewPassword}
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                              className="bg-black/40 border-[#3d2b1f] text-[#e8e0d5]"
                              placeholder="Confirm new password"
                              disabled={isChangingPassword}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              className="flex-1 bg-[#d4af37] hover:bg-[#c49d2e] text-black"
                              disabled={isChangingPassword}
                            >
                              {isChangingPassword ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Changing...
                                </>
                              ) : (
                                "Change Password"
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowPasswordChange(false);
                                setCurrentPassword("");
                                setNewPassword("");
                                setConfirmNewPassword("");
                              }}
                              disabled={isChangingPassword}
                              className="border-[#3d2b1f] text-[#a89f94]"
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      )}
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
