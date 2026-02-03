"use client";

/**
 * Template Editor Page
 *
 * Full-page editor for designing card templates.
 */

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Text, Title } from "@tremor/react";
import {
  ArrowLeft,
  Copy,
  Download,
  MoreHorizontal,
  Settings,
  Star,
  Trash2,
} from "lucide-react";
import { toPng } from "html-to-image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

import { apiAny } from "@/lib/convexHelpers";
import { TemplateEditor } from "@/components/templates/TemplateEditor";
import type { Rarity } from "@/components/templates/types";

const api = apiAny;

const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

interface TemplateEditorPageProps {
  params: Promise<{ templateId: string }>;
}

export default function TemplateEditorPage({ params }: TemplateEditorPageProps) {
  const { templateId } = use(params);
  const router = useRouter();

  // State
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");

  // Queries
  const template = useQuery(api.admin.templates.getTemplate, {
    templateId: templateId as any,
  });

  // Mutations
  const updateTemplate = useMutation(api.admin.templates.updateTemplate);
  const duplicateTemplate = useMutation(api.admin.templates.duplicateTemplate);
  const deleteTemplate = useMutation(api.admin.templates.deleteTemplate);
  const setDefaultTemplate = useMutation(api.admin.templates.setDefaultTemplate);

  // Handlers
  const handleUpdateSettings = async (updates: Record<string, any>) => {
    try {
      await updateTemplate({
        templateId: templateId as any,
        ...updates,
      });
      toast.success("Template updated");
    } catch (error) {
      toast.error("Failed to update template");
    }
  };

  const handleSetDefault = async () => {
    try {
      await setDefaultTemplate({ templateId: templateId as any });
      toast.success("Set as default template");
    } catch (error) {
      toast.error("Failed to set default");
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateName.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      const newId = await duplicateTemplate({
        templateId: templateId as any,
        newName: duplicateName.trim(),
      });
      toast.success("Template duplicated");
      setShowDuplicateDialog(false);
      router.push(`/templates/${newId}`);
    } catch (error) {
      toast.error("Failed to duplicate template");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTemplate({ templateId: templateId as any });
      toast.success("Template deleted");
      router.push("/templates");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete template");
    }
  };

  const handleExportPng = async () => {
    const canvas = document.getElementById("card-canvas");
    if (!canvas) {
      toast.error("Canvas not found");
      return;
    }

    try {
      const dataUrl = await toPng(canvas, {
        width: 1500,
        height: 2100,
        pixelRatio: 2,
      });

      // Download
      const link = document.createElement("a");
      link.download = `${template?.name || "card"}-template.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Template exported");
    } catch (error) {
      toast.error("Failed to export template");
    }
  };

  // Loading state
  if (template === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-muted-foreground">Loading template...</div>
      </div>
    );
  }

  // Not found
  if (template === null) {
    return (
      <div className="container mx-auto py-12 text-center">
        <Title>Template Not Found</Title>
        <Text className="text-muted-foreground mb-4">
          The template you're looking for doesn't exist.
        </Text>
        <Button asChild>
          <Link href="/templates">Back to Templates</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/templates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold">{template.name}</h1>
            <p className="text-xs text-muted-foreground capitalize">
              {template.cardType} template • {template.blocks.length} blocks
            </p>
          </div>
          {template.isDefault && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              Default
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Export */}
          <Button variant="outline" size="sm" onClick={handleExportPng}>
            <Download className="h-4 w-4 mr-2" />
            Export PNG
          </Button>

          {/* Settings */}
          <Sheet open={showSettings} onOpenChange={setShowSettings}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Template Settings</SheetTitle>
                <SheetDescription>
                  Configure template metadata and frame images.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 py-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={template.name}
                      onChange={(e) => handleUpdateSettings({ name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={template.description || ""}
                      onChange={(e) =>
                        handleUpdateSettings({ description: e.target.value || undefined })
                      }
                      placeholder="Describe this template..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Card Type</Label>
                    <Select
                      value={template.cardType}
                      onValueChange={(v) => handleUpdateSettings({ cardType: v })}
                    >
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

                {/* Frame Images */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Frame Images by Rarity</Label>
                  <p className="text-xs text-muted-foreground">
                    Upload different frame images for each rarity level.
                  </p>
                  {RARITIES.map((rarity) => (
                    <div key={rarity} className="space-y-1">
                      <Label className="text-xs capitalize">{rarity}</Label>
                      <Input
                        value={template.frameImages[rarity] || ""}
                        onChange={(e) =>
                          handleUpdateSettings({
                            frameImages: {
                              ...template.frameImages,
                              [rarity]: e.target.value || undefined,
                            },
                          })
                        }
                        placeholder="Image URL..."
                      />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <Label className="text-xs">Default Frame (fallback)</Label>
                    <Input
                      value={template.defaultFrameImageUrl || ""}
                      onChange={(e) =>
                        handleUpdateSettings({
                          defaultFrameImageUrl: e.target.value || undefined,
                        })
                      }
                      placeholder="Default frame URL..."
                    />
                  </div>
                </div>

                {/* Artwork Bounds */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Artwork Area</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">X (px)</Label>
                      <Input
                        type="number"
                        value={template.artworkBounds.x}
                        onChange={(e) =>
                          handleUpdateSettings({
                            artworkBounds: {
                              ...template.artworkBounds,
                              x: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Y (px)</Label>
                      <Input
                        type="number"
                        value={template.artworkBounds.y}
                        onChange={(e) =>
                          handleUpdateSettings({
                            artworkBounds: {
                              ...template.artworkBounds,
                              y: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Width (px)</Label>
                      <Input
                        type="number"
                        value={template.artworkBounds.width}
                        onChange={(e) =>
                          handleUpdateSettings({
                            artworkBounds: {
                              ...template.artworkBounds,
                              width: parseInt(e.target.value) || 100,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Height (px)</Label>
                      <Input
                        type="number"
                        value={template.artworkBounds.height}
                        onChange={(e) =>
                          handleUpdateSettings({
                            artworkBounds: {
                              ...template.artworkBounds,
                              height: parseInt(e.target.value) || 100,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Default Styles */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Default Text Styles</Label>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Font Family</Label>
                      <Input
                        value={template.defaultFontFamily}
                        onChange={(e) =>
                          handleUpdateSettings({ defaultFontFamily: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Font Size</Label>
                      <Input
                        type="number"
                        value={template.defaultFontSize}
                        onChange={(e) =>
                          handleUpdateSettings({
                            defaultFontSize: parseInt(e.target.value) || 16,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Font Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={template.defaultFontColor}
                          onChange={(e) =>
                            handleUpdateSettings({ defaultFontColor: e.target.value })
                          }
                          className="w-12 h-9 p-1"
                        />
                        <Input
                          value={template.defaultFontColor}
                          onChange={(e) =>
                            handleUpdateSettings({ defaultFontColor: e.target.value })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* More actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!template.isDefault && (
                <DropdownMenuItem onClick={handleSetDefault}>
                  <Star className="mr-2 h-4 w-4" />
                  Set as Default
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  setDuplicateName(`${template.name} (Copy)`);
                  setShowDuplicateDialog(true);
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Editor */}
      <TemplateEditor template={template} />

      {/* Duplicate Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Template</DialogTitle>
            <DialogDescription>
              Create a copy of this template with a new name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Template Name</Label>
              <Input
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="e.g., Standard Creature (Copy)"
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
              Are you sure you want to delete this template? This action cannot be
              undone. Templates in use by cards cannot be deleted.
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
