"use client";

/**
 * Card Templates Gallery Page
 *
 * Lists all card templates with filtering and CRUD actions.
 */

import { Card, Text, Title } from "@tremor/react";
import { LayoutTemplate, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { TemplateCard } from "@/components/templates/TemplateCard";
import type { CardType, TemplateListItem } from "@/components/templates/types";
import { api, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";

const CARD_TYPES: { value: CardType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "creature", label: "Creature" },
  { value: "spell", label: "Spell" },
  { value: "trap", label: "Trap" },
  { value: "equipment", label: "Equipment" },
  { value: "universal", label: "Universal" },
];

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<CardType | "all">("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Form state for new template
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCardType, setNewCardType] = useState<CardType>("creature");
  const [duplicateName, setDuplicateName] = useState("");

  // Queries
  const templates = useConvexQuery(api.admin.templates.listTemplates, {
    cardType: typeFilter === "all" ? undefined : typeFilter,
  });
  const stats = useConvexQuery(api.admin.templates.getTemplateStats, {});

  // Mutations
  const createTemplate = useConvexMutation(api.admin.templates.createTemplate);
  const duplicateTemplate = useConvexMutation(api.admin.templates.duplicateTemplate);
  const deleteTemplate = useConvexMutation(api.admin.templates.deleteTemplate);
  const setDefaultTemplate = useConvexMutation(api.admin.templates.setDefaultTemplate);

  // Filter templates by search query
  const filteredTemplates = templates?.filter((t: TemplateListItem) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handlers
  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Template name is required");
      return;
    }

    try {
      await createTemplate({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        cardType: newCardType,
      });
      toast.success("Template created");
      setShowCreateDialog(false);
      setNewName("");
      setNewDescription("");
      setNewCardType("creature");
    } catch (_error) {
      toast.error("Failed to create template");
    }
  };

  const handleDuplicate = async () => {
    if (!selectedTemplateId || !duplicateName.trim()) {
      toast.error("Template name is required");
      return;
    }

    try {
      await duplicateTemplate({
        templateId: selectedTemplateId as Id<"cardTemplates">,
        newName: duplicateName.trim(),
      });
      toast.success("Template duplicated");
      setShowDuplicateDialog(false);
      setDuplicateName("");
      setSelectedTemplateId(null);
    } catch (_error) {
      toast.error("Failed to duplicate template");
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplateId) return;

    try {
      await deleteTemplate({ templateId: selectedTemplateId as Id<"cardTemplates"> });
      toast.success("Template deleted");
      setShowDeleteDialog(false);
      setSelectedTemplateId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete template");
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      await setDefaultTemplate({ templateId: templateId as Id<"cardTemplates"> });
      toast.success("Set as default template");
    } catch (_error) {
      toast.error("Failed to set default");
    }
  };

  const openDuplicateDialog = (templateId: string) => {
    const template = templates?.find((t: TemplateListItem) => t._id === templateId);
    setSelectedTemplateId(templateId);
    setDuplicateName(template ? `${template.name} (Copy)` : "");
    setShowDuplicateDialog(true);
  };

  const openDeleteDialog = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setShowDeleteDialog(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Title>Card Templates</Title>
          <Text className="text-muted-foreground">
            Design and manage visual templates for card rendering
          </Text>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <Text className="text-muted-foreground">Total Templates</Text>
            <Title>{stats.total}</Title>
          </Card>
          <Card>
            <Text className="text-muted-foreground">Active</Text>
            <Title>{stats.active}</Title>
          </Card>
          <Card>
            <Text className="text-muted-foreground">Defaults</Text>
            <Title>{stats.defaults}</Title>
          </Card>
          <Card>
            <Text className="text-muted-foreground">Total Blocks</Text>
            <Title>{stats.totalBlocks}</Title>
          </Card>
          <Card>
            <Text className="text-muted-foreground">Creature Templates</Text>
            <Title>{stats.byType.creature}</Title>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as CardType | "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {CARD_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {!templates ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_: unknown, i: number) => (
            <Card key={`template-card-${i}` as string} className="animate-pulse">
              <div className="aspect-[750/1050] bg-muted rounded-lg mb-4" />
              <div className="h-6 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : filteredTemplates?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <LayoutTemplate className="h-12 w-12 text-muted-foreground mb-4" />
          <Title>No templates found</Title>
          <Text className="text-muted-foreground mb-4">
            {searchQuery
              ? "Try adjusting your search"
              : "Create your first card template to get started"}
          </Text>
          {!searchQuery && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates?.map((template: TemplateListItem) => (
            <TemplateCard
              key={template._id}
              template={template}
              onDuplicate={openDuplicateDialog}
              onDelete={openDeleteDialog}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a new card template for designing card layouts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                placeholder="e.g., Standard Creature"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe this template..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardType">Card Type</Label>
              <Select value={newCardType} onValueChange={(v) => setNewCardType(v as CardType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="creature">Creature</SelectItem>
                  <SelectItem value="spell">Spell</SelectItem>
                  <SelectItem value="trap">Trap</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="universal">Universal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Template</DialogTitle>
            <DialogDescription>Create a copy of this template with a new name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicateName">New Template Name</Label>
              <Input
                id="duplicateName"
                placeholder="e.g., Standard Creature (Copy)"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicate}>Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone. Templates
              in use by cards cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
