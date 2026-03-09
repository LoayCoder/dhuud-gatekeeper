import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Send, CheckCircle2, XCircle, Loader2, MessageSquare, Settings2, Power, PowerOff } from "lucide-react";

interface ProviderStatus {
  activeProvider: 'wasender' | 'twilio';
  wasenderConfigured: boolean;
  twilioConfigured: boolean;
}

export function WhatsAppSettings() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const currentTenantId = profile?.tenant_id;

  const [phoneNumber, setPhoneNumber] = useState("");
  const [testMessage, setTestMessage] = useState(t('whatsappSettings.defaultTestMessage'));
  const [sending, setSending] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    provider: string;
    messageId?: string;
    error?: string;
  } | null>(null);

  // Fetch current provider status
  const fetchProviderStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('update-whatsapp-provider', {
        body: { action: 'get' },
      });

      if (error) throw error;
      
      if (data.success) {
        setProviderStatus({
          activeProvider: data.activeProvider,
          wasenderConfigured: data.wasenderConfigured,
          twilioConfigured: data.twilioConfigured,
        });
      }
    } catch (err) {
      console.error('Failed to fetch provider status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchProviderStatus();
  }, []);

  const handleSwitchProvider = async (newProvider: 'wasender' | 'twilio') => {
    if (newProvider === 'wasender' && !providerStatus?.wasenderConfigured) {
      toast.error(t('whatsappSettings.wasenderNotConfigured'));
      return;
    }
    if (newProvider === 'twilio' && !providerStatus?.twilioConfigured) {
      toast.error(t('whatsappSettings.twilioNotConfigured'));
      return;
    }

    setSwitching(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-whatsapp-provider', {
        body: { action: 'set', provider: newProvider },
      });

      if (error) throw error;

      if (data.success) {
        setProviderStatus(prev => prev ? { ...prev, activeProvider: newProvider } : null);
        toast.success(t('whatsappSettings.switchedTo', { provider: newProvider }));
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast.error(errorMessage);
    } finally {
      setSwitching(false);
    }
  };

  const handleSendTest = async () => {
    if (!phoneNumber.trim()) {
      toast.error(t('whatsappSettings.enterPhoneNumber'));
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-whatsapp', {
        body: {
          phone_number: phoneNumber.trim(),
          message: testMessage.trim(),
          tenant_id: currentTenantId,
        },
      });

      if (error) throw error;

      if (data.success) {
        setLastResult({
          success: true,
          provider: data.provider,
          messageId: data.messageId,
        });
        toast.success(t('whatsappSettings.messageSentVia', { provider: data.provider }));
      } else {
        setLastResult({
          success: false,
          provider: data.provider || 'unknown',
          error: data.error,
        });
        toast.error(data.error || t('whatsappSettings.failedSendMessage'));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setLastResult({
        success: false,
        provider: 'unknown',
        error: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const ProviderCard = ({ 
    provider, 
    isActive, 
    isConfigured, 
    onActivate 
  }: { 
    provider: 'wasender' | 'twilio';
    isActive: boolean;
    isConfigured: boolean;
    onActivate: () => void;
  }) => {
    const providerName = provider === 'wasender' ? 'WaSender' : 'Twilio';
    
    return (
      <div className={`relative p-4 rounded-lg border-2 transition-all ${
        isActive 
          ? 'border-green-500 bg-green-500/10' 
          : isConfigured 
            ? 'border-border bg-muted/30 hover:border-primary/50' 
            : 'border-dashed border-muted-foreground/30 bg-muted/10 opacity-60'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isActive ? (
              <Power className="h-5 w-5 text-green-500" />
            ) : (
              <PowerOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{providerName}</span>
                {isActive && (
                  <Badge variant="default" className="bg-green-500 text-white text-xs">
                    {t('whatsappSettings.active')}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isConfigured 
                  ? t('whatsappSettings.configured')
                  : t('whatsappSettings.notConfigured')}
              </p>
            </div>
          </div>
          
          {!isActive && (
            <Button
              size="sm"
              variant={isConfigured ? "outline" : "ghost"}
              disabled={!isConfigured || switching}
              onClick={onActivate}
            >
              {switching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('whatsappSettings.activate')
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Provider Toggle Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t('whatsappSettings.activeProvider')}
          </CardTitle>
          <CardDescription>
            {t('whatsappSettings.activeProviderDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingStatus ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <ProviderCard
                provider="wasender"
                isActive={providerStatus?.activeProvider === 'wasender'}
                isConfigured={providerStatus?.wasenderConfigured ?? false}
                onActivate={() => handleSwitchProvider('wasender')}
              />
              <ProviderCard
                provider="twilio"
                isActive={providerStatus?.activeProvider === 'twilio'}
                isConfigured={providerStatus?.twilioConfigured ?? false}
                onActivate={() => handleSwitchProvider('twilio')}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Message Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('whatsappSettings.testMessage')}
          </CardTitle>
          <CardDescription>
            {t('whatsappSettings.testMessageDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">
                {t('whatsappSettings.phoneNumber')}
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+966501234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                dir="ltr"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {t('whatsappSettings.phoneHint')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">
                {t('whatsappSettings.messageText')}
              </Label>
              <Textarea
                id="message"
                placeholder={t('whatsappSettings.messagePlaceholder')}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <Button 
              onClick={handleSendTest} 
              disabled={sending || !phoneNumber.trim()}
              className="w-full sm:w-auto"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  {t('whatsappSettings.sending')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 me-2" />
                  {t('whatsappSettings.sendTestMessage')}
                </>
              )}
            </Button>

            {lastResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                lastResult.success 
                  ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400' 
                  : 'bg-destructive/10 border-destructive/30 text-destructive'
              }`}>
                {lastResult.success ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0" />
                )}
                <div className="text-sm">
                  {lastResult.success ? (
                    <>
                      <span className="font-medium">
                        {t('whatsappSettings.sentVia')} {lastResult.provider}
                      </span>
                      {lastResult.messageId && (
                        <span className="block text-xs opacity-75 font-mono">
                          ID: {lastResult.messageId.substring(0, 20)}...
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="font-medium">
                        {t('whatsappSettings.failedToSend')}
                      </span>
                      {lastResult.error && (
                        <span className="block text-xs opacity-75">
                          {lastResult.error}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Help */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('whatsappSettings.howToConfigure')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-1">WaSender</h4>
            <ol className="list-decimal list-inside space-y-1 ps-2">
              <li>{t('whatsappSettings.wasenderStep1')}</li>
              <li>{t('whatsappSettings.wasenderStep2')}</li>
              <li>{t('whatsappSettings.wasenderStep3')}</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">Twilio</h4>
            <ol className="list-decimal list-inside space-y-1 ps-2">
              <li>{t('whatsappSettings.twilioStep1')}:
                <code className="text-xs bg-muted px-1 rounded ms-1">TWILIO_ACCOUNT_SID</code>,
                <code className="text-xs bg-muted px-1 rounded ms-1">TWILIO_AUTH_TOKEN</code>,
                <code className="text-xs bg-muted px-1 rounded ms-1">TWILIO_WHATSAPP_NUMBER</code>
              </li>
              <li>{t('whatsappSettings.twilioStep2')}</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
