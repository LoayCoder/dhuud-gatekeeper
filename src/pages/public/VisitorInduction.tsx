/**
 * Visitor Induction Page
 * 
 * Public page for visitors to watch safety induction video
 * and acknowledge completion.
 */
import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  useVisitorInductionDetails, 
  useUpdateInductionProgress,
  useCompleteVisitorInduction 
} from '@/hooks/use-visitor-induction-workflow';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, 
  Check, Globe, Shield, AlertTriangle, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VisitorInduction() {
  const { inductionId } = useParams<{ inductionId: string }>();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [canAcknowledge, setCanAcknowledge] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const { data, isLoading, error } = useVisitorInductionDetails(inductionId);
  const updateProgress = useUpdateInductionProgress();
  const completeInduction = useCompleteVisitorInduction();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  // Handle video time update
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const percent = (video.currentTime / video.duration) * 100;
      setProgress(percent);

      // Enable acknowledgment when 80% watched
      if (percent >= 80) {
        setCanAcknowledge(true);
      }

      // Periodically save progress
      if (Math.floor(percent) % 10 === 0 && inductionId) {
        updateProgress.mutate({ inductionId, progressPercent: Math.floor(percent) });
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCanAcknowledge(true);
      if (inductionId) {
        updateProgress.mutate({ inductionId, progressPercent: 100 });
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [inductionId, updateProgress]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const handleComplete = async () => {
    if (!inductionId) return;
    await completeInduction.mutateAsync({ inductionId });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-pulse text-muted-foreground">
          {t('common.loading', 'Loading...')}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive">
              {t('visitors.induction.invalidLink', 'Invalid or expired induction link')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if already completed
  if (data.induction.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold">
                {t('visitors.induction.alreadyCompleted', 'Induction Already Completed')}
              </h2>
              <p className="text-muted-foreground">
                {t('visitors.induction.alreadyCompletedDesc', 'You have already completed this safety induction.')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if expired
  if (data.induction.expires_at && new Date(data.induction.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h2 className="text-xl font-semibold">
                {t('visitors.induction.expired', 'Induction Link Expired')}
              </h2>
              <p className="text-muted-foreground">
                {t('visitors.induction.expiredDesc', 'Please contact the facility to request a new induction link.')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const videoTitle = isRTL ? (data.video?.title_ar || data.video?.title) : data.video?.title;

  return (
    <div className="min-h-screen bg-muted/30 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Language Toggle */}
      <div className="fixed top-4 end-4 z-50">
        <Button variant="outline" size="sm" onClick={toggleLanguage}>
          <Globe className="w-4 h-4 me-2" />
          {i18n.language === 'ar' ? 'English' : 'العربية'}
        </Button>
      </div>

      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">
            {t('visitors.induction.safetyInduction', 'Safety Induction')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('visitors.induction.welcomeMessage', 'Welcome')} {data.visitor?.full_name}
          </p>
        </div>

        {/* Video Player */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{videoTitle}</CardTitle>
            <CardDescription>
              {t('visitors.induction.watchVideo', 'Please watch the entire safety video')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.video?.video_url ? (
              <>
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={data.video.video_url}
                    className="w-full h-full"
                    playsInline
                  />
                  
                  {/* Video Controls Overlay */}
                  <div className="absolute bottom-0 start-0 end-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <Progress value={progress} className="mb-3" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={togglePlay}
                        >
                          {isPlaying ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={toggleMute}
                        >
                          {isMuted ? (
                            <VolumeX className="w-5 h-5" />
                          ) : (
                            <Volume2 className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm">
                          {Math.round(progress)}%
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={toggleFullscreen}
                        >
                          <Maximize className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Info */}
                <div className={cn(
                  "flex items-center gap-2 text-sm",
                  canAcknowledge ? "text-green-600" : "text-muted-foreground"
                )}>
                  {canAcknowledge ? (
                    <>
                      <Check className="w-4 h-4" />
                      {t('visitors.induction.videoComplete', 'Video watched - you can now complete the induction')}
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      {t('visitors.induction.watchProgress', 'Watch at least 80% to continue')}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">
                  {t('visitors.induction.noVideo', 'No video available')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acknowledgment Section */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t('visitors.induction.acknowledgment', 'Acknowledgment')}
            </CardTitle>
            <CardDescription>
              {t('visitors.induction.acknowledgmentDesc', 'Confirm you understand and agree to follow safety guidelines')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start space-x-3 rtl:space-x-reverse">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
                disabled={!canAcknowledge}
              />
              <Label
                htmlFor="acknowledge"
                className={cn(
                  "text-sm leading-relaxed",
                  !canAcknowledge && "text-muted-foreground"
                )}
              >
                {t('visitors.induction.acknowledgmentText', 
                  'I have watched and understood the safety induction video. I agree to follow all safety guidelines and procedures during my visit.'
                )}
              </Label>
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={!canAcknowledge || !acknowledged || completeInduction.isPending}
              onClick={handleComplete}
            >
              {completeInduction.isPending ? (
                t('common.submitting', 'Submitting...')
              ) : (
                <>
                  <Check className="w-4 h-4 me-2" />
                  {t('visitors.induction.completeInduction', 'Complete Induction')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
