/**
 * Send Visitor Induction Dialog
 * 
 * Dialog for sending induction to a visitor.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useSendVisitorInduction, 
  useInductionVideosForVisitors 
} from '@/hooks/use-visitor-induction-workflow';
import { MessageSquare, Mail, Smartphone, Video, Clock, Play } from 'lucide-react';

interface SendVisitorInductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitorId: string;
  visitorName: string;
}

export function SendVisitorInductionDialog({
  open,
  onOpenChange,
  visitorId,
  visitorName,
}: SendVisitorInductionDialogProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [sendMethod, setSendMethod] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp');

  const { data: videos, isLoading: videosLoading } = useInductionVideosForVisitors();
  const sendInduction = useSendVisitorInduction();

  type VideoItem = { id: string; title: string; description?: string; video_url: string; duration_seconds?: number; is_required?: boolean };
  const videoList = videos as VideoItem[] | undefined;
  const selectedVideo = videoList?.find(v => v.id === selectedVideoId);

  const handleSend = async () => {
    if (!selectedVideoId) return;

    await sendInduction.mutateAsync({
      visitorId,
      videoId: selectedVideoId,
      sendMethod,
    });

    onOpenChange(false);
    setSelectedVideoId('');
    setSendMethod('whatsapp');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            {t('visitors.induction.sendTitle', 'Send Induction')}
          </DialogTitle>
          <DialogDescription>
            {t('visitors.induction.sendDescription', 'Send safety induction to')} {visitorName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Video Selection */}
          <div className="space-y-2">
            <Label>{t('visitors.induction.selectVideo', 'Select Video')}</Label>
            {videosLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                {t('common.loading', 'Loading...')}
              </div>
            ) : videoList && videoList.length > 0 ? (
              <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('visitors.induction.chooseVideo', 'Choose a video')} />
                </SelectTrigger>
                <SelectContent>
                  {videoList.map((video) => (
                    <SelectItem key={video.id} value={video.id}>
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-muted-foreground" />
                        <span>{video.title}</span>
                        {video.duration_seconds && (
                          <span className="text-xs text-muted-foreground">
                            ({Math.round(video.duration_seconds / 60)} min)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('visitors.induction.noVideos', 'No induction videos available')}
              </p>
            )}
          </div>

          {/* Video Preview Info */}
          {selectedVideo && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <p className="font-medium text-sm">
                {selectedVideo.title}
              </p>
              {selectedVideo.description && (
                <p className="text-xs text-muted-foreground">
                  {selectedVideo.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {selectedVideo.duration_seconds && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.round(selectedVideo.duration_seconds / 60)} {t('common.minutes', 'min')}
                  </span>
                )}
                {selectedVideo.is_required && (
                  <span className="text-yellow-600">
                    {t('visitors.induction.required', 'Required')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Send Method */}
          <div className="space-y-2">
            <Label>{t('visitors.induction.sendMethod', 'Send Via')}</Label>
            <RadioGroup
              value={sendMethod}
              onValueChange={(v) => setSendMethod(v as typeof sendMethod)}
              className="grid grid-cols-3 gap-2"
            >
              <Label
                htmlFor="whatsapp"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <RadioGroupItem value="whatsapp" id="whatsapp" className="sr-only" />
                <MessageSquare className="w-6 h-6 mb-2" />
                <span className="text-xs">WhatsApp</span>
              </Label>
              <Label
                htmlFor="email"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <RadioGroupItem value="email" id="email" className="sr-only" />
                <Mail className="w-6 h-6 mb-2" />
                <span className="text-xs">Email</span>
              </Label>
              <Label
                htmlFor="sms"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <RadioGroupItem value="sms" id="sms" className="sr-only" />
                <Smartphone className="w-6 h-6 mb-2" />
                <span className="text-xs">SMS</span>
              </Label>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSend}
            disabled={!selectedVideoId || sendInduction.isPending}
          >
            {sendInduction.isPending 
              ? t('common.sending', 'Sending...') 
              : t('common.send', 'Send')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
