"use client";

import { useProfile } from "@/hooks";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

export default function ProfilePage() {
  const { isAuthenticated } = useAuth();
  const { profile: currentUser, isLoading: profileLoading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (currentUser?._id) {
      router.replace(`/profile/${currentUser._id}`);
    }
  }, [currentUser?._id, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-profile pt-24">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Please log in to view your profile</p>
        </div>
      </div>
    );
  }

  if (currentUser === undefined) {
    return (
      <div className="min-h-screen bg-profile pt-24">
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // This will be handled by useEffect redirect
  return (
    <div className="min-h-screen bg-profile pt-24">
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </div>
  );
}
