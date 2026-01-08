import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AITag } from "@/hooks/use-ai-tags";

interface AITagsSelectorProps {
  availableTags: AITag[];
  selectedTags: string[];
  suggestedTags?: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function AITagsSelector({
  availableTags,
  selectedTags,
  suggestedTags = [],
  onTagsChange,
  disabled = false,
  className,
}: AITagsSelectorProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const isRTL = i18n.dir() === "rtl";

  const handleToggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const handleRemoveTag = (tagName: string) => {
    onTagsChange(selectedTags.filter((t) => t !== tagName));
  };

  const handleAcceptSuggestions = () => {
    const newTags = [...new Set([...selectedTags, ...suggestedTags])];
    onTagsChange(newTags);
  };

  const getTagLabel = (tag: AITag) => {
    return isRTL && tag.name_ar ? tag.name_ar : tag.name;
  };

  const unselectedTags = availableTags.filter(
    (tag) => !selectedTags.includes(tag.name)
  );

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tagName) => {
          const tag = availableTags.find((t) => t.name === tagName);
          return (
            <Badge
              key={tagName}
              variant="secondary"
              style={{ backgroundColor: tag?.color ? `${tag.color}20` : undefined }}
              className="gap-1 pe-1"
            >
              {tag ? getTagLabel(tag) : tagName}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tagName)}
                  className="ms-1 rounded-full hover:bg-muted p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          );
        })}

        {/* Add Tag Button */}
        {!disabled && unselectedTags.length > 0 && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 gap-1 px-2">
                <Plus className="h-3 w-3" />
                {t("admin.ai.addTag", "Add Tag")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="space-y-1">
                {unselectedTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      handleToggleTag(tag.name);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {getTagLabel(tag)}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* AI Suggested Tags */}
      {suggestedTags.length > 0 && !disabled && (
        <div className="rounded-md border border-dashed border-primary/50 bg-primary/5 p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {t("admin.ai.suggestedTags", "AI Suggested Tags:")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-xs"
              onClick={handleAcceptSuggestions}
            >
              <Check className="h-3 w-3" />
              {t("admin.ai.acceptAll", "Accept All")}
            </Button>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {suggestedTags.map((tagName) => {
              const tag = availableTags.find((t) => t.name === tagName);
              const isSelected = selectedTags.includes(tagName);
              return (
                <Badge
                  key={tagName}
                  variant={isSelected ? "default" : "outline"}
                  style={{ 
                    backgroundColor: isSelected && tag?.color ? `${tag.color}20` : undefined,
                    borderColor: tag?.color,
                  }}
                  className={cn(
                    "cursor-pointer transition-colors",
                    isSelected && "opacity-50"
                  )}
                  onClick={() => !isSelected && handleToggleTag(tagName)}
                >
                  {tag ? getTagLabel(tag) : tagName}
                  {isSelected && <Check className="ms-1 h-3 w-3" />}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
