import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, CheckCircle, XCircle, Loader2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationTemplate } from '@/hooks/useNotificationTemplates';

interface TemplateTestConsoleProps {
  templates: NotificationTemplate[];
}

interface TestResult {
  success: boolean;
  messageId?: string;
  error?: string;
  renderedMessage?: string;
  gateway?: string;
}

export function TemplateTestConsole({ templates }: TemplateTestConsoleProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [selectedSlug, setSelectedSlug] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [jsonData, setJsonData] = useState('{}');
  const [gateway, setGateway] = useState<'wasender' | 'official'>('wasender');
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.slug === selectedSlug);

  const validateJson = (value: string) => {
    try {
      JSON.parse(value);
      setJsonError(null);
      return true;
    } catch {
      setJsonError('Invalid JSON format');
      return false;
    }
  };

  const getPreviewMessage = () => {
    if (!selectedTemplate) return '';
    try {
      const data = JSON.parse(jsonData);
      let result = selectedTemplate.content_pattern;
      (selectedTemplate.variable_keys || []).forEach((key, index) => {
        const placeholder = `{{${index + 1}}}`;
        const value = data[key] ?? `[${key}]`;
        result = result.split(placeholder).join(value);
      });
      return result;
    } catch {
      return selectedTemplate.content_pattern;
    }
  };

  const handleSend = async () => {
    if (!selectedSlug || !phoneNumber) return;
    if (!validateJson(jsonData)) return;

    setIsSending(true);
    setTestResult(null);

    try {
      const dataObject = JSON.parse(jsonData);
      
      const { data, error } = await supabase.functions.invoke('send-whatsapp-template', {
        body: {
          phone: phoneNumber,
          templateSlug: selectedSlug,
          dataObject,
          gateway,
          tenant_id: tenantId,
        },
      });

      if (error) throw error;

      setTestResult(data);
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message || 'Failed to send message',
      });
    } finally {
      setIsSending(false);
    }
  };

  const generateSampleJson = () => {
    if (!selectedTemplate) return;
    const sample: Record<string, string> = {};
    (selectedTemplate.variable_keys || []).forEach((key) => {
      sample[key] = `sample_${key}`;
    });
    setJsonData(JSON.stringify(sample, null, 2));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Test Console
        </CardTitle>
        <CardDescription>
          Test your templates by sending real messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select value={selectedSlug} onValueChange={setSelectedSlug}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.slug}>
                    <span className="flex items-center gap-2">
                      {t.slug}
                      <Badge variant="outline" className="text-xs">
                        {t.category}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+966501234567"
            />
          </div>
        </div>

        {selectedTemplate && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Data Object (JSON)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={generateSampleJson}
                >
                  Generate Sample
                </Button>
              </div>
              <Textarea
                value={jsonData}
                onChange={(e) => {
                  setJsonData(e.target.value);
                  validateJson(e.target.value);
                }}
                placeholder='{"customer_name": "John", "order_id": "12345"}'
                rows={4}
                className={jsonError ? 'border-destructive' : ''}
              />
              {jsonError && (
                <p className="text-sm text-destructive">{jsonError}</p>
              )}
              <div className="text-xs text-muted-foreground">
                Expected keys: {selectedTemplate.variable_keys?.join(', ') || 'none'}
              </div>
            </div>

            <Card className="bg-muted/50">
              <CardHeader className="py-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="bg-background p-3 rounded-md border whitespace-pre-wrap text-sm">
                  {getPreviewMessage()}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <div className="flex items-center gap-4">
          <div className="space-y-2">
            <Label>Gateway</Label>
            <Select value={gateway} onValueChange={(v: 'wasender' | 'official') => setGateway(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wasender">WaSender</SelectItem>
                <SelectItem value="official">Official (Meta)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSend}
            disabled={!selectedSlug || !phoneNumber || isSending || !!jsonError}
            className="mt-auto"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 me-2" />
            )}
            Send Test Message
          </Button>
        </div>

        {testResult && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            <div className="flex items-start gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <AlertDescription>
                {testResult.success ? (
                  <div className="space-y-1">
                    <p className="font-medium">Message sent successfully!</p>
                    <p className="text-sm">Message ID: {testResult.messageId}</p>
                    <p className="text-sm">Gateway: {testResult.gateway}</p>
                  </div>
                ) : (
                  <p>{testResult.error}</p>
                )}
              </AlertDescription>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
