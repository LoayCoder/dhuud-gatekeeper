import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Languages, Loader2 } from 'lucide-react';
import { CHANNEL_OPTIONS, CATEGORIES } from '../constants';

export function TemplateFormFields({ state }: { state: unknown }) {
  const {
    formData, setFormData, showWhatsAppFields, showEmailFields,
    handleTranslate, canTranslate, isTranslating, emailSubjectRef,
    activeDropTarget, setActiveDropTarget, handleSubjectDrop, handleSubjectDragOver
  } = state;

  return (
    <>
      {/* Channel Type Selector */}
      <div className="space-y-2">
        <Label>Channel Type</Label>
        <div className="flex gap-2">
          {CHANNEL_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={formData.channel_type === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormData({ ...formData, channel_type: option.value })}
              className="flex items-center gap-2"
            >
              {option.icon}
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (Unique ID)</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) =>
              setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') })
            }
            placeholder="order_confirmation"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {showWhatsAppFields && (
          <div className="space-y-2">
            <Label htmlFor="gateway">WhatsApp Gateway</Label>
            <Select
              value={formData.default_gateway}
              onValueChange={(value: 'official' | 'wasender') =>
                setFormData({ ...formData, default_gateway: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wasender">WaSender</SelectItem>
                <SelectItem value="official">Official (Meta)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <div className="flex gap-2">
            <Select
              value={formData.language}
              onValueChange={(value) => setFormData({ ...formData, language: value })}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية (Arabic)</SelectItem>
                {formData.category !== 'visitors' && (
                  <>
                    <SelectItem value="ur">اردو (Urdu)</SelectItem>
                    <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                    <SelectItem value="fil">Filipino</SelectItem>
                    <SelectItem value="zh">中文 (Chinese)</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleTranslate}
              disabled={!canTranslate || isTranslating}
              title="Translate content to selected language"
            >
              {isTranslating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Languages className="h-4 w-4" />
              )}
            </Button>
          </div>
          {formData.category === 'visitors' && (
            <p className="text-xs text-muted-foreground">
              Visitor templates support Arabic and English only
            </p>
          )}
          {canTranslate && !isTranslating && (
            <p className="text-xs text-muted-foreground">
              Click the translate button to auto-translate content
            </p>
          )}
        </div>
      </div>

      {showWhatsAppFields && formData.default_gateway === 'official' && (
        <div className="space-y-2">
          <Label htmlFor="meta_template_name">Meta Template Name</Label>
          <Input
            id="meta_template_name"
            value={formData.meta_template_name || ''}
            onChange={(e) =>
              setFormData({ ...formData, meta_template_name: e.target.value })
            }
            placeholder="Template name from Meta Business Manager"
          />
        </div>
      )}

      {showEmailFields && (
        <div className="space-y-2">
          <Label htmlFor="email_subject">Email Subject</Label>
          <Input
            ref={emailSubjectRef}
            id="email_subject"
            value={formData.email_subject || ''}
            onChange={(e) =>
              setFormData({ ...formData, email_subject: e.target.value })
            }
            onFocus={() => setActiveDropTarget('subject')}
            onDrop={handleSubjectDrop}
            onDragOver={handleSubjectDragOver}
            placeholder="🚨 New {{1}}: {{2}}"
            className={`transition-all ${activeDropTarget === 'subject' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
          />
          <p className="text-xs text-muted-foreground">
            Click on the field, then click a variable to insert it. Or drag and drop.
          </p>
        </div>
      )}
    </>
  );
}
