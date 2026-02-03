"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

export function SubscriptionStatus() {
  const subscription = useQuery(api.stripe.queries.getCurrentSubscription);
  const createPortalSession = useMutation(api.stripe.portal.createBillingPortalSession);

  if (!subscription) {
    return null;
  }

  const handleManageSubscription = async () => {
    try {
      const result = await createPortalSession({});
      if (result.portalUrl) {
        window.location.href = result.portalUrl;
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
      alert("Failed to open subscription management. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Subscription Status</CardTitle>
          <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
            {subscription.status}
          </Badge>
        </div>
        <CardDescription>
          {subscription.planInterval === "month" ? "Monthly" : "Yearly"} plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm text-muted-foreground">Current Period</div>
          <div className="text-lg font-medium">
            {formatDate(subscription.currentPeriodStart)} -{" "}
            {formatDate(subscription.currentPeriodEnd)}
          </div>
        </div>

        {subscription.cancelAtPeriodEnd && (
          <div className="text-sm text-yellow-600">
            Your subscription will end on {formatDate(subscription.currentPeriodEnd)}
          </div>
        )}

        <Button onClick={handleManageSubscription} variant="outline" className="w-full">
          Manage Subscription
        </Button>
      </CardContent>
    </Card>
  );
}
