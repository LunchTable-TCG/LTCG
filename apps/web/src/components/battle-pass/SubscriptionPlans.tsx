"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";

export function SubscriptionPlans() {
  const [selectedPlan, setSelectedPlan] = useState<"month" | "year">("month");
  const [isLoading, setIsLoading] = useState(false);
  const createCheckout = useMutation(api.stripe.checkout.createCheckoutSession);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const result = await createCheckout({ planInterval: selectedPlan });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
      <Card
        className={`cursor-pointer transition-all ${
          selectedPlan === "month" ? "ring-2 ring-primary" : ""
        }`}
        onClick={() => setSelectedPlan("month")}
      >
        <CardHeader>
          <CardTitle>Monthly</CardTitle>
          <CardDescription>Billed monthly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">$4.20</div>
          <div className="text-muted-foreground">/month</div>
        </CardContent>
      </Card>

      <Card
        className={`cursor-pointer transition-all ${
          selectedPlan === "year" ? "ring-2 ring-primary" : ""
        }`}
        onClick={() => setSelectedPlan("year")}
      >
        <CardHeader>
          <CardTitle>Yearly</CardTitle>
          <CardDescription>Billed annually - Save 27%</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">$36.90</div>
          <div className="text-muted-foreground">/year</div>
          <div className="text-sm text-green-500 mt-2">Save $13.50 compared to monthly</div>
        </CardContent>
      </Card>

      <div className="md:col-span-2">
        <Button onClick={handleSubscribe} disabled={isLoading} className="w-full" size="lg">
          {isLoading ? "Loading..." : "Join the Collective"}
        </Button>
      </div>
    </div>
  );
}
