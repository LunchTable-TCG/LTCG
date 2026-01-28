"use client";

/**
 * API Keys Management Page
 *
 * View, search, and manage API keys across all players.
 */

import { DataTable, StatCard, StatGrid } from "@/components/data";
import { PageWrapper } from "@/components/layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/contexts/AdminContext";
import type { ApiKey, ColumnDef } from "@/types";
import { api } from "@convex/_generated/api";
import { Card, Flex, Text, Title } from "@tremor/react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Column Definitions
// =============================================================================

const columns: ColumnDef<ApiKey>[] = [
  {
    id: "keyPrefix",
    header: "Key",
    accessorKey: "keyPrefix",
    cell: (row) => (
      <code className="font-mono text-sm bg-muted px-2 py-1 rounded">{row.keyPrefix}...</code>
    ),
  },
  {
    id: "name",
    header: "Name",
    accessorKey: "name",
    sortable: true,
    cell: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    id: "playerName",
    header: "Player",
    accessorKey: "playerName",
    sortable: true,
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => {
      const isExpired = row.expiresAt && row.expiresAt < Date.now();
      if (!row.isActive) {
        return <Badge variant="destructive">Revoked</Badge>;
      }
      if (isExpired) {
        return <Badge variant="secondary">Expired</Badge>;
      }
      return <Badge variant="default">Active</Badge>;
    },
  },
  {
    id: "permissions",
    header: "Permissions",
    cell: (row) => (
      <span className="text-sm text-muted-foreground">
        {row.permissions.length} permission{row.permissions.length !== 1 ? "s" : ""}
      </span>
    ),
  },
  {
    id: "lastUsedAt",
    header: "Last Used",
    accessorKey: "lastUsedAt",
    sortable: true,
    cell: (row) =>
      row.lastUsedAt ? (
        <span className="text-sm">{new Date(row.lastUsedAt).toLocaleDateString()}</span>
      ) : (
        <span className="text-muted-foreground text-sm">Never</span>
      ),
  },
  {
    id: "createdAt",
    header: "Created",
    accessorKey: "createdAt",
    sortable: true,
    cell: (row) => <span className="text-sm">{new Date(row.createdAt).toLocaleDateString()}</span>,
  },
];

// =============================================================================
// Component
// =============================================================================

export default function ApiKeysPage() {
  const router = useRouter();
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);

  // Fetch API keys
  const apiKeys = useQuery(api.admin.apiKeys.listApiKeys, { limit: 100 });

  // Mutations
  const revokeKey = useMutation(api.admin.apiKeys.revokeApiKey);
  const reactivateKey = useMutation(api.admin.apiKeys.reactivateApiKey);
  const deleteKey = useMutation(api.admin.apiKeys.deleteApiKey);

  const isLoading = apiKeys === undefined;

  // Stats - Date.now() is called once per memoization cycle, not every render
  // react-hooks/purity detects Date.now() as impure even inside useMemo
  /* eslint-disable react-hooks/purity */
  const stats = useMemo(() => {
    if (!apiKeys) return { total: 0, active: 0, revoked: 0, recentlyUsed: 0 };
    const nowTime = Date.now();
    return {
      total: apiKeys.length,
      active: apiKeys.filter((k: ApiKey) => k.isActive && (!k.expiresAt || k.expiresAt > nowTime))
        .length,
      revoked: apiKeys.filter((k: ApiKey) => !k.isActive).length,
      recentlyUsed: apiKeys.filter(
        (k: ApiKey) => k.lastUsedAt && nowTime - k.lastUsedAt < 7 * 24 * 60 * 60 * 1000
      ).length,
    };
  }, [apiKeys]);
  /* eslint-enable react-hooks/purity */

  const totalKeys = stats.total;
  const activeKeys = stats.active;
  const revokedKeys = stats.revoked;
  const recentlyUsed = stats.recentlyUsed;

  // Handlers
  const handleRevoke = async () => {
    if (!selectedKey) return;

    try {
      await revokeKey({ keyId: selectedKey._id });
      toast.success(`API key "${selectedKey.name}" revoked`);
      setRevokeDialogOpen(false);
      setSelectedKey(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke key");
    }
  };

  const handleReactivate = async () => {
    if (!selectedKey) return;

    try {
      await reactivateKey({ keyId: selectedKey._id });
      toast.success(`API key "${selectedKey.name}" reactivated`);
      setReactivateDialogOpen(false);
      setSelectedKey(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reactivate key");
    }
  };

  const handleDelete = async () => {
    if (!selectedKey) return;

    try {
      await deleteKey({ keyId: selectedKey._id });
      toast.success(`API key "${selectedKey.name}" permanently deleted`);
      setDeleteDialogOpen(false);
      setSelectedKey(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete key");
    }
  };

  return (
    <PageWrapper
      title="API Keys"
      description="Manage API keys for AI agents and external integrations"
    >
      {/* Stats Overview */}
      <StatGrid columns={4}>
        <StatCard
          title="Total Keys"
          value={totalKeys}
          icon={<span className="text-lg">🔑</span>}
          isLoading={isLoading}
        />
        <StatCard
          title="Active Keys"
          value={activeKeys}
          icon={<span className="text-lg">✓</span>}
          isLoading={isLoading}
        />
        <StatCard
          title="Revoked Keys"
          value={revokedKeys}
          icon={<span className="text-lg">🚫</span>}
          isLoading={isLoading}
        />
        <StatCard
          title="Used This Week"
          value={recentlyUsed}
          icon={<span className="text-lg">📊</span>}
          isLoading={isLoading}
        />
      </StatGrid>

      {/* Info Card */}
      <Card className="mt-6">
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title>About API Keys</Title>
            <Text className="text-muted-foreground">
              API keys allow AI agents and external applications to interact with the game. Each key
              is tied to a player and has specific permissions.
            </Text>
          </div>
          <Button variant="outline" asChild>
            <a href="/docs/endpoints">View API Docs</a>
          </Button>
        </Flex>
      </Card>

      {/* Keys Table */}
      <Card className="mt-6">
        <Title>All API Keys</Title>
        <div className="mt-4">
          <DataTable<ApiKey>
            data={apiKeys}
            columns={columns}
            rowKey="_id"
            isLoading={isLoading}
            searchable
            searchPlaceholder="Search by name or player..."
            searchColumns={["name", "playerName"]}
            pageSize={15}
            emptyMessage="No API keys found"
            onRowClick={(row) => router.push(`/players/${row.playerId}`)}
            rowActions={(row) => (
              <div className="flex gap-2">
                {row.isActive ? (
                  <RoleGuard permission="player.edit">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedKey(row);
                        setRevokeDialogOpen(true);
                      }}
                    >
                      Revoke
                    </Button>
                  </RoleGuard>
                ) : (
                  <RoleGuard permission="player.edit">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedKey(row);
                        setReactivateDialogOpen(true);
                      }}
                    >
                      Reactivate
                    </Button>
                  </RoleGuard>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/players/${row.playerId}`);
                  }}
                >
                  View Player
                </Button>
                <RoleGuard permission="admin.manage">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedKey(row);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    Delete
                  </Button>
                </RoleGuard>
              </div>
            )}
          />
        </div>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately revoke &ldquo;{selectedKey?.name}&rdquo; for player &ldquo;
              {selectedKey?.playerName}&rdquo;. Any active connections using this key will stop
              working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground"
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Confirmation Dialog */}
      <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This will reactivate &ldquo;{selectedKey?.name}&rdquo; for player &ldquo;
              {selectedKey?.playerName}&rdquo;. The key will be able to access the API again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate}>Reactivate Key</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{selectedKey?.name}&rdquo; for player &ldquo;
              {selectedKey?.playerName}&rdquo;. This action cannot be undone. The key prefix &ldquo;
              {selectedKey?.keyPrefix}...&rdquo; will be gone forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
