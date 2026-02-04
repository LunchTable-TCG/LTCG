/**
 * News Management Page
 *
 * Create, edit, and manage news articles for the Chronicles page.
 */

"use client";

import { StatCard, StatGrid } from "@/components/data";
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
import { RoleGuard } from "@/contexts/AdminContext";
import { api, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import {
  CalendarIcon,
  EditIcon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  Loader2Icon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type NewsCategory = "update" | "event" | "patch" | "announcement" | "maintenance";

interface Article {
  _id: Id<"newsArticles">;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: NewsCategory;
  imageUrl?: string;
  isPublished: boolean;
  isPinned: boolean;
  publishedAt?: number;
  createdAt: number;
  updatedAt: number;
}

const CATEGORIES: { value: NewsCategory; label: string; color: string }[] = [
  {
    value: "announcement",
    label: "Announcement",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  { value: "update", label: "Update", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  {
    value: "event",
    label: "Event",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  {
    value: "patch",
    label: "Patch Notes",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
];

function getCategoryStyle(category: NewsCategory) {
  return CATEGORIES.find((c) => c.value === category)?.color ?? "bg-gray-500/20 text-gray-400";
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function NewsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [deleteConfirmArticle, setDeleteConfirmArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<NewsCategory | "all">("all");

  // Convex queries and mutations
  const articlesResult = useConvexQuery(api.admin.news.listArticles, {
    includeUnpublished: true,
    limit: 100,
  });

  const statsResult = useConvexQuery(api.admin.news.getNewsStats, {});

  const createArticle = useConvexMutation(api.admin.news.createArticle);
  const updateArticle = useConvexMutation(api.admin.news.updateArticle);
  const deleteArticle = useConvexMutation(api.admin.news.deleteArticle);
  const togglePublished = useConvexMutation(api.admin.news.togglePublished);
  const togglePinned = useConvexMutation(api.admin.news.togglePinned);

  // Filter articles
  const filteredArticles = (articlesResult ?? []).filter((article: Article) => {
    if (categoryFilter !== "all" && article.category !== categoryFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        article.title.toLowerCase().includes(query) || article.excerpt.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Handlers
  const handleCreateArticle = useCallback(
    async (data: {
      title: string;
      slug: string;
      excerpt: string;
      content: string;
      category: NewsCategory;
      imageUrl?: string;
      isPublished: boolean;
    }) => {
      try {
        await createArticle(data);
        toast.success("Article created");
        setCreateDialogOpen(false);
      } catch (error) {
        toast.error("Failed to create article", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [createArticle]
  );

  const handleUpdateArticle = useCallback(
    async (data: {
      title: string;
      slug: string;
      excerpt: string;
      content: string;
      category: NewsCategory;
      imageUrl?: string;
      isPublished: boolean;
    }) => {
      if (!editingArticle) return;
      try {
        await updateArticle({
          articleId: editingArticle._id,
          ...data,
        });
        toast.success("Article updated");
        setEditingArticle(null);
      } catch (error) {
        toast.error("Failed to update article", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [editingArticle, updateArticle]
  );

  const handleTogglePublished = useCallback(
    async (article: Article) => {
      try {
        const result = (await togglePublished({ articleId: article._id })) as {
          isPublished: boolean;
        };
        toast.success(result.isPublished ? "Article published" : "Article unpublished");
      } catch (_error) {
        toast.error("Failed to toggle publish status");
      }
    },
    [togglePublished]
  );

  const handleTogglePinned = useCallback(
    async (article: Article) => {
      try {
        const result = (await togglePinned({ articleId: article._id })) as { isPinned: boolean };
        toast.success(result.isPinned ? "Article pinned" : "Article unpinned");
      } catch (_error) {
        toast.error("Failed to toggle pin status");
      }
    },
    [togglePinned]
  );

  const handleDeleteArticle = useCallback(async () => {
    if (!deleteConfirmArticle) return;
    try {
      await deleteArticle({ articleId: deleteConfirmArticle._id });
      toast.success("Article deleted");
      setDeleteConfirmArticle(null);
    } catch (_error) {
      toast.error("Failed to delete article");
    }
  }, [deleteConfirmArticle, deleteArticle]);

  return (
    <RoleGuard minRole="admin">
      <PageWrapper
        title="News & Announcements"
        description="Manage Chronicles content for the web app"
        actions={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Article
          </Button>
        }
      >
        {/* Stats */}
        <StatGrid columns={4}>
          <StatCard
            title="Total Articles"
            value={statsResult?.total ?? 0}
            isLoading={!statsResult}
          />
          <StatCard
            title="Published"
            value={statsResult?.published ?? 0}
            isLoading={!statsResult}
          />
          <StatCard title="Drafts" value={statsResult?.drafts ?? 0} isLoading={!statsResult} />
          <StatCard title="Pinned" value={statsResult?.pinned ?? 0} isLoading={!statsResult} />
        </StatGrid>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value as NewsCategory | "all")}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="text-sm text-muted-foreground">{filteredArticles.length} articles</div>
        </div>

        {/* Articles List */}
        {!articlesResult ? (
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileTextIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No articles found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredArticles.map((article: Article) => (
              <div
                key={article._id}
                className="flex items-start gap-4 p-4 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{article.title}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryStyle(article.category)}`}
                    >
                      {article.category}
                    </span>
                    {article.isPinned && <PinIcon className="h-4 w-4 text-amber-500" />}
                    {!article.isPublished && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate mb-2">{article.excerpt}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {new Date(article.createdAt).toLocaleDateString()}
                    </span>
                    {article.publishedAt && (
                      <span>Published {new Date(article.publishedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTogglePublished(article)}
                    title={article.isPublished ? "Unpublish" : "Publish"}
                  >
                    {article.isPublished ? (
                      <EyeIcon className="h-4 w-4" />
                    ) : (
                      <EyeOffIcon className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTogglePinned(article)}
                    title={article.isPinned ? "Unpin" : "Pin"}
                  >
                    <PinIcon className={`h-4 w-4 ${article.isPinned ? "text-amber-500" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditingArticle(article)}>
                    <EditIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirmArticle(article)}
                  >
                    <TrashIcon className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <ArticleDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateArticle}
          title="Create Article"
        />

        {/* Edit Dialog */}
        <ArticleDialog
          open={!!editingArticle}
          onOpenChange={(open) => !open && setEditingArticle(null)}
          onSubmit={handleUpdateArticle}
          title="Edit Article"
          initialData={editingArticle ?? undefined}
        />

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deleteConfirmArticle}
          onOpenChange={(open) => !open && setDeleteConfirmArticle(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Article</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deleteConfirmArticle?.title}&quot;? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteArticle}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageWrapper>
    </RoleGuard>
  );
}

// =============================================================================
// Article Dialog Component
// =============================================================================

interface ArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: NewsCategory;
    imageUrl?: string;
    isPublished: boolean;
  }) => Promise<void>;
  title: string;
  initialData?: Article;
}

function ArticleDialog({ open, onOpenChange, onSubmit, title, initialData }: ArticleDialogProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title ?? "",
    slug: initialData?.slug ?? "",
    excerpt: initialData?.excerpt ?? "",
    content: initialData?.content ?? "",
    category: initialData?.category ?? ("announcement" as NewsCategory),
    imageUrl: initialData?.imageUrl ?? "",
    isPublished: initialData?.isPublished ?? false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!initialData);

  // Reset form when dialog opens with new data
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && initialData) {
      setFormData({
        title: initialData.title,
        slug: initialData.slug,
        excerpt: initialData.excerpt,
        content: initialData.content,
        category: initialData.category,
        imageUrl: initialData.imageUrl ?? "",
        isPublished: initialData.isPublished,
      });
      setAutoSlug(false);
    } else if (newOpen && !initialData) {
      setFormData({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        category: "announcement",
        imageUrl: "",
        isPublished: false,
      });
      setAutoSlug(true);
    }
    onOpenChange(newOpen);
  };

  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      title: value,
      slug: autoSlug ? slugify(value) : prev.slug,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.slug || !formData.excerpt || !formData.content) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        imageUrl: formData.imageUrl || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update the article details below."
              : "Create a new article for the Chronicles page."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Article title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug *{" "}
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => setAutoSlug(!autoSlug)}
                >
                  ({autoSlug ? "auto" : "manual"})
                </button>
              </Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => {
                  setAutoSlug(false);
                  setFormData((prev) => ({ ...prev, slug: e.target.value }));
                }}
                placeholder="article-slug"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value as NewsCategory }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Featured Image URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt * (shown in listing)</Label>
            <Input
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Brief summary of the article"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content * (Markdown supported)</Label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Full article content..."
              className="w-full min-h-[200px] px-3 py-2 rounded-md border bg-background text-sm resize-y"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={formData.isPublished}
              onChange={(e) => setFormData((prev) => ({ ...prev, isPublished: e.target.checked }))}
              className="h-4 w-4"
            />
            <Label htmlFor="isPublished" className="font-normal">
              Publish immediately
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
