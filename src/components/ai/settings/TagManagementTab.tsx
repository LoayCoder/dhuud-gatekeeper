import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, X, Tag } from "lucide-react";
import { useAITags, type AITag, type AITagType, type CreateAITagInput } from "@/hooks/use-ai-tags";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TagFormData {
  name: string;
  name_ar: string;
  color: string;
  keywords: string;
  is_active: boolean;
}

const defaultFormData: TagFormData = {
  name: "",
  name_ar: "",
  color: "#6366f1",
  keywords: "",
  is_active: true,
};

const colorOptions = [
  "#6366f1", // Indigo
  "#22c55e", // Green
  "#eab308", // Yellow
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#a855f7", // Purple
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#ec4899", // Pink
  "#64748b", // Slate
];

function TagList({ tagType }: { tagType: AITagType }) {
  const { t, i18n } = useTranslation();
  const { tags, isLoading, createTag, updateTag, deleteTag, isCreating, isUpdating, isDeleting } = useAITags(tagType);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<AITag | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TagFormData>(defaultFormData);
  const isRTL = i18n.dir() === "rtl";

  const handleOpenCreate = () => {
    setEditingTag(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (tag: AITag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      name_ar: tag.name_ar || "",
      color: tag.color,
      keywords: tag.keywords.join(", "),
      is_active: tag.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const input: CreateAITagInput = {
      name: formData.name,
      name_ar: formData.name_ar || undefined,
      color: formData.color,
      keywords: formData.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      is_active: formData.is_active,
    };

    if (editingTag) {
      updateTag({ id: editingTag.id, ...input });
    } else {
      createTag(input);
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (deletingTagId) {
      deleteTag(deletingTagId);
      setDeleteDialogOpen(false);
      setDeletingTagId(null);
    }
  };

  const getTagLabel = (tag: AITag) => {
    return isRTL && tag.name_ar ? tag.name_ar : tag.name;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("admin.ai.tags.count", "{{count}} tags configured", { count: tags.length })}
        </p>
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="me-2 h-4 w-4" />
          {t("admin.ai.tags.add", "Add Tag")}
        </Button>
      </div>

      {tags.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <Tag className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {t("admin.ai.tags.empty", "No tags configured yet")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getTagLabel(tag)}</span>
                    {!tag.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        {t("common.inactive", "Inactive")}
                      </Badge>
                    )}
                  </div>
                  {tag.keywords.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("admin.ai.tags.keywords", "Keywords")}: {tag.keywords.join(", ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenEdit(tag)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setDeletingTagId(tag.id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTag
                ? t("admin.ai.tags.edit", "Edit Tag")
                : t("admin.ai.tags.create", "Create Tag")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.ai.tags.formDesc", "Define tag details and keywords for AI matching")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t("admin.ai.tags.name", "Name (English)")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="PPE"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_ar">{t("admin.ai.tags.nameAr", "Name (Arabic)")}</Label>
                <Input
                  id="name_ar"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="معدات الحماية"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("admin.ai.tags.color", "Color")}</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      formData.color === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">
                {t("admin.ai.tags.keywordsLabel", "Keywords (comma-separated)")}
              </Label>
              <Input
                id="keywords"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="helmet, gloves, safety glasses, ppe"
              />
              <p className="text-xs text-muted-foreground">
                {t("admin.ai.tags.keywordsHint", "AI will apply this tag when these keywords are detected")}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">{t("admin.ai.tags.active", "Active")}</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || isCreating || isUpdating}>
              {(isCreating || isUpdating) && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {editingTag ? t("common.save", "Save") : t("common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.ai.tags.deleteTitle", "Delete Tag?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.ai.tags.deleteDesc", "This action cannot be undone. The tag will be removed from AI suggestions.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {isDeleting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function TagManagementTab() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.ai.tags.title", "AI Tag Management")}</CardTitle>
          <CardDescription>
            {t("admin.ai.tags.desc", "Define tags that AI can apply to observations and incidents based on content analysis")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="observation">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="observation">
                {t("admin.ai.tags.observation", "Observation Tags")}
              </TabsTrigger>
              <TabsTrigger value="incident">
                {t("admin.ai.tags.incident", "Incident Tags")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="observation" className="mt-4">
              <TagList tagType="observation" />
            </TabsContent>
            <TabsContent value="incident" className="mt-4">
              <TagList tagType="incident" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
