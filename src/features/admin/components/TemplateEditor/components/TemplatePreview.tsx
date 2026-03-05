import React from 'react';
import { Eye, MessageSquare, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SYSTEM_VARIABLES } from '../constants';

export function TemplatePreview({ state }: { state: unknown }) {
  const {
    showWhatsAppFields, showEmailFields, getPreviewMessage, getPreviewSubject,
    formData, previewData, setPreviewData
  } = state;

  return (
    <Card className="bg-muted/50">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Live Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3">
        <Tabs defaultValue={showWhatsAppFields ? 'whatsapp' : 'email'}>
          <TabsList className="mb-3">
            {showWhatsAppFields && (
              <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </TabsTrigger>
            )}
            {showEmailFields && (
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
            )}
          </TabsList>

          {showWhatsAppFields && (
            <TabsContent value="whatsapp">
              <div className="bg-[#e5ddd5] p-4 rounded-md">
                <div className="bg-[#dcf8c6] p-3 rounded-lg max-w-sm ms-auto shadow-sm whitespace-pre-wrap text-sm">
                  {getPreviewMessage() || 'Enter message content to see preview...'}
                </div>
              </div>
            </TabsContent>
          )}

          {showEmailFields && (
            <TabsContent value="email">
              <div className="bg-background border rounded-md overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b">
                  <p className="text-xs text-muted-foreground">Subject:</p>
                  <p className="font-medium text-sm">
                    {getPreviewSubject() || 'No subject set'}
                  </p>
                </div>
                <div className="p-4 whitespace-pre-wrap text-sm">
                  {getPreviewMessage() || 'Enter message content to see preview...'}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {formData.variable_keys.length > 0 && (
          <div className="mt-3 space-y-2">
            <Label className="text-xs text-muted-foreground">Test Values:</Label>
            <div className="grid grid-cols-2 gap-2">
              {formData.variable_keys.map((key: string) => {
                const sysVar = SYSTEM_VARIABLES.find(v => v.key === key);
                return (
                  <div key={key} className="flex items-center gap-2">
                    <Label className="text-xs w-24 truncate font-mono">{key}:</Label>
                    <Input
                      placeholder={sysVar?.example || key}
                      value={previewData[key] || ''}
                      onChange={(e) =>
                        setPreviewData({ ...previewData, [key]: e.target.value })
                      }
                      className="h-8 text-sm flex-1"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
