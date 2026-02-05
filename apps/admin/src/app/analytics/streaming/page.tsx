"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Video, Twitch, Youtube } from "lucide-react";
import { MetricTile } from "@/components/analytics/MetricTile";
import { ChartCard } from "@/components/analytics/ChartCard";
import { DonutChart, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@tremor/react";

export default function StreamingAnalyticsPage() {
  // Get all streaming sessions
  const allSessions = useQuery(api.streaming.sessions.getAllSessions, { limit: 100 });
  const activeSessions = useQuery(api.streaming.sessions.getActiveStreams);

  if (allSessions === undefined || activeSessions === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // Calculate metrics
  const totalStreams = allSessions.length;
  const activeStreamsCount = activeSessions.length;
  const completedStreams = allSessions.filter((s: typeof allSessions[number]) => s.status === "ended");

  const totalDuration = completedStreams.reduce((sum: number, s: typeof completedStreams[number]) => {
    return sum + (s.stats?.duration || 0);
  }, 0);

  const avgDuration = completedStreams.length > 0 ? totalDuration / completedStreams.length : 0;

  const totalViewers = completedStreams.reduce((sum: number, s: typeof completedStreams[number]) => {
    return sum + (s.peakViewerCount || 0);
  }, 0);

  const avgViewers = completedStreams.length > 0 ? totalViewers / completedStreams.length : 0;

  // Platform breakdown
  const platformStats = allSessions.reduce(
    (acc: { twitch: number; youtube: number; custom: number }, session: typeof allSessions[number]) => {
      if (session.platform === "twitch") acc.twitch++;
      else if (session.platform === "youtube") acc.youtube++;
      else acc.custom++;
      return acc;
    },
    { twitch: 0, youtube: 0, custom: 0 }
  );

  // Stream type breakdown
  const typeStats = allSessions.reduce(
    (acc: { user: number; agent: number }, session: typeof allSessions[number]) => {
      if (session.streamType === "user") acc.user++;
      else acc.agent++;
      return acc;
    },
    { user: 0, agent: 0 }
  );

  // Recent streams for table
  const recentStreams = allSessions.slice(0, 20).map((session: typeof allSessions[number]) => ({
    id: session._id,
    title: session.streamTitle,
    type: session.streamType,
    platform: session.platform,
    status: session.status,
    viewers: session.peakViewerCount || 0,
    duration: session.stats?.duration
      ? `${Math.floor(session.stats.duration / 60000)}m`
      : "—",
    createdAt: new Date(session.createdAt).toLocaleDateString(),
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Streaming Analytics</h1>
          <p className="text-muted-foreground">Monitor live streams and analyze performance</p>
        </div>
        <Badge variant={activeStreamsCount > 0 ? "default" : "secondary"} className="text-lg px-4 py-2">
          {activeStreamsCount} Live
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          title="Total Streams"
          value={totalStreams.toString()}
          icon={<span className="text-lg">📹</span>}
        />
        <MetricTile
          title="Active Streams"
          value={activeStreamsCount.toString()}
          icon={<span className="text-lg">🔴</span>}
          subtitle="Currently live"
        />
        <MetricTile
          title="Avg Duration"
          value={`${Math.floor(avgDuration / 60000)}m`}
          icon={<span className="text-lg">⏱️</span>}
          subtitle="Per completed stream"
        />
        <MetricTile
          title="Avg Peak Viewers"
          value={Math.round(avgViewers).toString()}
          icon={<span className="text-lg">📈</span>}
          subtitle="Per completed stream"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active Streams</TabsTrigger>
          <TabsTrigger value="history">Stream History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Platform Distribution */}
            <ChartCard
              title="Platform Distribution"
              description="Streams by platform"
            >
              <DonutChart
                className="h-full"
                data={[
                  { name: "Twitch", value: platformStats.twitch },
                  { name: "YouTube", value: platformStats.youtube },
                  { name: "Custom RTMP", value: platformStats.custom },
                ]}
                category="value"
                index="name"
                colors={["purple", "red", "gray"]}
                showAnimation
                valueFormatter={(v: number) => v.toLocaleString()}
              />
            </ChartCard>

            {/* Stream Type Distribution */}
            <ChartCard
              title="Stream Type"
              description="User vs AI Agent streams"
            >
              <DonutChart
                className="h-full"
                data={[
                  { name: "User Streams", value: typeStats.user },
                  { name: "AI Agent Streams", value: typeStats.agent },
                ]}
                category="value"
                index="name"
                colors={["blue", "violet"]}
                showAnimation
                valueFormatter={(v: number) => v.toLocaleString()}
              />
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeStreamsCount === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active streams</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeSessions.map((session: typeof activeSessions[number]) => (
                <Card key={session._id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <CardTitle className="text-lg">{session.streamTitle}</CardTitle>
                        <Badge variant="outline">{session.streamType}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.platform === "twitch" && <Twitch className="h-5 w-5 text-purple-500" />}
                        {session.platform === "youtube" && <Youtube className="h-5 w-5 text-red-500" />}
                        <Badge>{session.platform}</Badge>
                      </div>
                    </div>
                    <CardDescription>
                      Started {new Date(session.startedAt || session.createdAt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-muted-foreground">Status:</span>{" "}
                        <span className="font-medium capitalize">{session.status}</span>
                      </div>
                      {session.viewerCount !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Viewers:</span>{" "}
                          <span className="font-medium">{session.viewerCount}</span>
                        </div>
                      )}
                      {session.peakViewerCount !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Peak:</span>{" "}
                          <span className="font-medium">{session.peakViewerCount}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Title</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Platform</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Peak Viewers</TableHeaderCell>
                  <TableHeaderCell>Duration</TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentStreams.map((stream: typeof recentStreams[number]) => (
                  <TableRow key={stream.id}>
                    <TableCell>{stream.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {stream.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{stream.platform}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          stream.status === "live"
                            ? "default"
                            : stream.status === "ended"
                              ? "secondary"
                              : "outline"
                        }
                        className="capitalize"
                      >
                        {stream.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{stream.viewers}</TableCell>
                    <TableCell>{stream.duration}</TableCell>
                    <TableCell>{stream.createdAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
