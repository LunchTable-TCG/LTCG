"use client";

/**
 * Stripe Admin Dashboard
 *
 * Visibility into Stripe subscriptions, payments, and webhook events.
 * Displays MRR, churn, subscription analytics, and customer details.
 */

import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, useConvexQuery } from "@/lib/convexHelpers";
import { Badge, BarChart, DonutChart, Metric, ProgressBar, Text, Title } from "@tremor/react";
import {
  AlertTriangleIcon,
  CreditCardIcon,
  DollarSignIcon,
  SearchIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UserIcon,
  UsersIcon,
  WebhookIcon,
} from "lucide-react";
import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

interface StripeWebhookEvent {
  _id: string;
  type: string;
  ageFormatted: string;
  processed: boolean;
}

interface FailedWebhookEvent {
  _id: string;
  type: string;
  error: string;
  receivedAt: number;
}

interface StripeCustomer {
  _id: string;
  username?: string;
  email?: string;
  stripeCustomerId?: string;
  createdAt: number;
}

// =============================================================================
// Metric Card Component
// =============================================================================

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: "blue" | "emerald" | "amber" | "purple" | "rose";
  trend?: { direction: "up" | "down"; value: string };
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <Text className="text-sm text-muted-foreground">{title}</Text>
            <Metric className="mt-1">{value}</Metric>
            {subtitle && <Text className="text-xs text-muted-foreground mt-1">{subtitle}</Text>}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend.direction === "up" ? (
                  <TrendingUpIcon className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDownIcon className="h-3 w-3 text-rose-500" />
                )}
                <Text className={trend.direction === "up" ? "text-emerald-500" : "text-rose-500"}>
                  {trend.value}
                </Text>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Stripe Overview
// =============================================================================

function StripeOverview() {
  const overview = useConvexQuery(api.admin.stripe.getStripeOverview, {});

  if (!overview) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-20 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Monthly Recurring Revenue"
        value={`$${overview.mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle={`ARR: $${overview.arr.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
        icon={DollarSignIcon}
        color="emerald"
      />
      <MetricCard
        title="Active Subscriptions"
        value={overview.subscriptions.active.toLocaleString()}
        subtitle={`${overview.subscriptions.trialing} trialing`}
        icon={CreditCardIcon}
        color="blue"
      />
      <MetricCard
        title="Churn Rate (30d)"
        value={`${overview.churn.rate.toFixed(1)}%`}
        subtitle={`${overview.churn.recentCancellations} cancellations`}
        icon={TrendingDownIcon}
        color={overview.churn.rate > 5 ? "rose" : "amber"}
      />
      <MetricCard
        title="ARPU"
        value={`$${overview.arpu.toFixed(2)}`}
        subtitle="Avg Revenue Per User"
        icon={UserIcon}
        color="purple"
      />
    </div>
  );
}

// =============================================================================
// Subscription Stats
// =============================================================================

function SubscriptionStats() {
  const overview = useConvexQuery(api.admin.stripe.getStripeOverview, {});
  const breakdown = useConvexQuery(api.admin.stripe.getSubscriptionBreakdown, {});

  if (!overview || !breakdown) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const statusData = breakdown.byStatus.map((s: { status: string; count: number }) => ({
    name: s.status,
    value: s.count,
  }));

  const statusColors = {
    active: "emerald",
    trialing: "blue",
    past_due: "amber",
    canceled: "rose",
    incomplete: "gray",
    incomplete_expired: "gray",
    unpaid: "rose",
  } as const;

  const getStatusColor = (status: string) =>
    (statusColors as Record<string, string>)[status] ?? "gray";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>Distribution by subscription state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <DonutChart
              className="h-48 w-48"
              data={statusData}
              category="value"
              index="name"
              colors={statusData.map((s: { name: string }) => statusColors[s.name] || "gray")}
              showLabel
            />
            <div className="space-y-2">
              {breakdown.byStatus.map((s: { status: string; count: number }) => (
                <div key={s.status} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full bg-${statusColors[s.status] || "gray"}-500`}
                    />
                    <Text>{s.status}</Text>
                  </div>
                  <Badge color={getStatusColor(s.status)}>{s.count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by Plan</CardTitle>
          <CardDescription>MRR contribution by plan tier</CardDescription>
        </CardHeader>
        <CardContent>
          {breakdown.byPlanAmount.length === 0 ? (
            <Text className="text-muted-foreground">No active plans</Text>
          ) : (
            <div className="space-y-4">
              {breakdown.byPlanAmount.map((p: { plan: string; count: number; mrr: number }) => (
                <div key={p.plan} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Text className="font-medium">{p.plan}</Text>
                    <div className="flex items-center gap-3">
                      <Badge color="gray">{p.count} subs</Badge>
                      <Text className="font-semibold text-emerald-600">${p.mrr.toFixed(2)}/mo</Text>
                    </div>
                  </div>
                  <ProgressBar
                    value={(p.mrr / (breakdown.byPlanAmount[0]?.mrr || 1)) * 100}
                    color="emerald"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <Text className="text-xs text-muted-foreground">Total Customers</Text>
              <Title>{overview.customers.total.toLocaleString()}</Title>
            </div>
            <div>
              <Text className="text-xs text-muted-foreground">With Active Sub</Text>
              <Title>{overview.customers.withActiveSubscription.toLocaleString()}</Title>
            </div>
            <div>
              <Text className="text-xs text-muted-foreground">Monthly Plans</Text>
              <Title>{overview.plans.monthly.toLocaleString()}</Title>
            </div>
            <div>
              <Text className="text-xs text-muted-foreground">Yearly Plans</Text>
              <Title>{overview.plans.yearly.toLocaleString()}</Title>
            </div>
            <div>
              <Text className="text-xs text-muted-foreground">Pending Cancellation</Text>
              <Title className="text-amber-600">
                {overview.subscriptions.pendingCancellation.toLocaleString()}
              </Title>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Subscription Trend Chart
// =============================================================================

function SubscriptionTrendChart() {
  const [days, setDays] = useState(30);
  const trend = useConvexQuery(api.admin.stripe.getSubscriptionTrend, { days });

  if (!trend) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const chartData = trend.map(
    (d: { date: string; created: number; canceled: number; updated: number }) => ({
      date: d.date,
      Created: d.created,
      Canceled: d.canceled,
      Updated: d.updated,
    })
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Subscription Activity</CardTitle>
          <CardDescription>New, canceled, and updated subscriptions</CardDescription>
        </div>
        <Select value={days.toString()} onValueChange={(v) => setDays(Number.parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="14">14 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="60">60 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <BarChart
          className="h-72"
          data={chartData}
          index="date"
          categories={["Created", "Canceled", "Updated"]}
          colors={["emerald", "rose", "blue"]}
          showLegend
          showGridLines={false}
        />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Webhook Events Monitor
// =============================================================================

function WebhookEventsMonitor() {
  const [showProcessed, setShowProcessed] = useState(true);
  const events = useConvexQuery(api.admin.stripe.getRecentStripeEvents, {
    limit: 50,
    includeProcessed: showProcessed,
  });
  const failedEvents = useConvexQuery(api.admin.stripe.getFailedWebhookEvents, { limit: 10 });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <WebhookIcon className="h-5 w-5" />
              Recent Webhook Events
            </CardTitle>
            <CardDescription>Stripe webhook activity</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowProcessed(!showProcessed)}>
            {showProcessed ? "Hide Processed" : "Show All"}
          </Button>
        </CardHeader>
        <CardContent>
          {!events ? (
            <div className="h-64 animate-pulse bg-muted rounded" />
          ) : events.length === 0 ? (
            <Text className="text-muted-foreground">No webhook events</Text>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.map((event: StripeWebhookEvent) => (
                <div
                  key={event._id}
                  className="flex items-center justify-between p-2 rounded-lg border text-sm"
                >
                  <div>
                    <Text className="font-mono text-xs">{event.type}</Text>
                    <Text className="text-xs text-muted-foreground">{event.ageFormatted}</Text>
                  </div>
                  <Badge color={event.processed ? "emerald" : "amber"}>
                    {event.processed ? "Processed" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-rose-500" />
            Failed Events
          </CardTitle>
          <CardDescription>Events that encountered errors</CardDescription>
        </CardHeader>
        <CardContent>
          {!failedEvents ? (
            <div className="h-64 animate-pulse bg-muted rounded" />
          ) : failedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Text>No failed events</Text>
              <Text className="text-xs">All webhooks processed successfully</Text>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {failedEvents.map((event: FailedWebhookEvent) => (
                <div
                  key={event._id}
                  className="p-3 rounded-lg border border-rose-200 bg-rose-50/50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Text className="font-mono text-xs">{event.type}</Text>
                    <Badge color="rose">Failed</Badge>
                  </div>
                  <Text className="text-xs text-rose-600">{event.error}</Text>
                  <Text className="text-xs text-muted-foreground mt-1">
                    {new Date(event.receivedAt).toLocaleString()}
                  </Text>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Customer Search
// =============================================================================

function CustomerSearch() {
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const customers = useConvexQuery(
    api.admin.stripe.searchStripeCustomers,
    searchQuery.length >= 2 ? { search: searchQuery, limit: 20 } : "skip"
  );

  const handleSearch = () => {
    if (search.length >= 2) {
      setSearchQuery(search);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5" />
          Customer Search
        </CardTitle>
        <CardDescription>Search by email or Stripe customer ID</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Search by email or customer ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch}>
            <SearchIcon className="h-4 w-4" />
          </Button>
        </div>

        {searchQuery && !customers && <div className="h-32 animate-pulse bg-muted rounded" />}

        {customers && customers.length === 0 && (
          <Text className="text-muted-foreground">No customers found</Text>
        )}

        {customers && customers.length > 0 && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {customers.map((customer: StripeCustomer) => (
              <div
                key={customer._id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <Text className="font-medium">{customer.username}</Text>
                  <Text className="text-sm text-muted-foreground">{customer.email}</Text>
                  <Text className="text-xs font-mono text-muted-foreground">
                    {customer.stripeCustomerId}
                  </Text>
                </div>
                <div className="text-right">
                  <Text className="text-xs text-muted-foreground">
                    Created {new Date(customer.createdAt).toLocaleDateString()}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function StripeDashboardPage() {
  return (
    <PageWrapper
      title="Stripe Dashboard"
      description="Subscription and payment analytics"
      actions={
        <Button variant="outline" asChild>
          <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
            Open Stripe Dashboard
          </a>
        </Button>
      }
    >
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <StripeOverview />
          <SubscriptionTrendChart />
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          <StripeOverview />
          <SubscriptionStats />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <WebhookEventsMonitor />
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <CustomerSearch />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
