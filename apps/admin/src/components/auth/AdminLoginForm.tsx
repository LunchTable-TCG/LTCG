"use client";

/**
 * Admin Login Form
 *
 * Uses Privy for authentication to match the main web app.
 * Admins log in with their Privy account (email OTP).
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePrivy } from "@privy-io/react-auth";
import { Loader2, ShieldCheck } from "lucide-react";

export function AdminLoginForm() {
  const { login, ready } = usePrivy();

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your authorized admin account
          </p>
        </div>

        <Button onClick={login} className="w-full" disabled={!ready}>
          {!ready ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Sign In with Privy"
          )}
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Only authorized administrators can access this dashboard.
        </p>
      </Card>
    </div>
  );
}
