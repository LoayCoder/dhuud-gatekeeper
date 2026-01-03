import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquare, Clock, Users, Send, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ContractorWorker } from "@/hooks/contractor-management/use-contractor-workers";

interface WorkerBulkMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workers: ContractorWorker[];
}

export function WorkerBulkMessageDialog({
  open,
  onOpenChange,
  workers,
}: WorkerBulkMessageDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState({ sent: 0, total: 0 });

  // Filter workers with valid mobile numbers
  const workersWithMobile = useMemo(
    () => workers.filter((w) => w.mobile_number && w.mobile_number.trim() !== ""),
    [workers]
  );

  // Format estimated time for display
  const formatEstimatedTime = (workerCount: number): string => {
    const totalSeconds = workerCount * 30;
    if (totalSeconds < 60) {
      return `${totalSeconds} ${t("common.seconds", "seconds")}`;
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (seconds === 0) {
      return `${minutes} ${t("common.minutes", "minutes")}`;
    }
    return `${minutes} ${t("common.minutes", "minutes")} ${seconds} ${t("common.seconds", "seconds")}`;
  };

  const handleSendMessages = async () => {
    if (!message.trim() || workersWithMobile.length === 0) return;

    setIsSending(true);
    setSendingProgress({ sent: 0, total: workersWithMobile.length });

    try {
      const { data, error } = await supabase.functions.invoke("send-worker-bulk-message", {
        body: {
          worker_ids: workersWithMobile.map((w) => w.id),
          message: message.trim(),
          tenant_id: tenantId,
        },
      });

      if (error) throw error;

      toast({
        title: t("contractors.workers.messageSent", "Messages sent successfully"),
        description: t("contractors.workers.messageDelay", "Messages will be sent with a 30-second delay between each"),
      });

      setMessage("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to send bulk messages:", error);
      toast({
        variant: "destructive",
        title: t("contractors.workers.messageFailed", "Failed to send some messages"),
        description: error.message,
      });
    } finally {
      setIsSending(false);
      setSendingProgress({ sent: 0, total: 0 });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("contractors.workers.bulkMessageTitle", "Send Bulk Message")}
          </DialogTitle>
          <DialogDescription>
            {t("contractors.workers.recipientCount", "{{count}} recipients selected", {
              count: workersWithMobile.length,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients preview */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4" />
              {t("contractors.workers.workers", "Workers")} ({workersWithMobile.length})
            </Label>
            <ScrollArea className="h-32 border rounded-md p-2">
              <div className="space-y-2">
                {workersWithMobile.map((worker) => (
                  <div key={worker.id} className="flex items-center gap-2 text-sm">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={worker.photo_path || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(worker.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{worker.full_name}</span>
                    <span className="text-muted-foreground text-xs">{worker.mobile_number}</span>
                  </div>
                ))}
                {workers.length > workersWithMobile.length && (
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    {workers.length - workersWithMobile.length} worker(s) skipped (no mobile number)
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Message input */}
          <div>
            <Label htmlFor="message">
              {t("contractors.workers.customMessage", "Custom Message")}
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t(
                "contractors.workers.customMessagePlaceholder",
                "Enter your message here..."
              )}
              rows={4}
              className="mt-1"
            />
          </div>

          {/* Delay warning */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-1">
              <span className="font-medium">
                {t("contractors.workers.messageDelayTitle", "Message Delay")}
              </span>
              <span>{t("contractors.workers.messageDelay", "Messages will be sent with a 30-second delay between each")}</span>
              <span className="text-xs text-muted-foreground">
                {t("contractors.workers.estimatedTime", "Estimated time: {{time}}", {
                  time: formatEstimatedTime(workersWithMobile.length),
                })}
              </span>
            </AlertDescription>
          </Alert>

          {workersWithMobile.length === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                None of the selected workers have mobile numbers.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSendMessages}
            disabled={!message.trim() || workersWithMobile.length === 0 || isSending}
          >
            {isSending ? (
              <>
                <Clock className="h-4 w-4 me-1 animate-spin" />
                {t("contractors.workers.sending", "Sending...")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 me-1" />
                {t("contractors.workers.sendMessages", "Send Messages")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
