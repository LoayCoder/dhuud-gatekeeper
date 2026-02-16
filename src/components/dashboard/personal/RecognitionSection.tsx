import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useGamification } from '@/hooks/use-gamification';
import {
    Trophy,
    Award,
    Star,
    Activity,
    User,
    Building2
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function RecognitionSection() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: stats } = useGamification();

    // Default/Loading State
    const level = stats?.level || 1;
    const points = stats?.totalPoints || 0;
    const nextLevel = stats?.nextLevelPoints || 200;
    const badges = stats?.badges || [];
    const rank = stats?.rank || { company: '-', department: '-' };
    const earnedBadgesCount = badges.filter(b => b.unlocked).length;

    // Find next badge to unlock (first locked one)
    const nextBadge = badges.find(b => !b.unlocked);
    const progressPercent = nextBadge ? (nextBadge.progress / nextBadge.totalRequired) * 100 : 100;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">{t('dashboard.recognitionAndAchievements', 'Recognition & Achievements')}</h2>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Safety Ranking Card */}
                <Card className="p-6 space-y-6 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/achievements')}>
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-muted-foreground" />
                        <h3 className="font-medium text-lg">{t('dashboard.yourHsseRanking', 'Your HSSE Ranking')}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-muted/50 flex flex-col items-center justify-center space-y-2">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-2xl font-bold">{rank.company}</span>
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('dashboard.company', 'Company')}</span>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50 flex flex-col items-center justify-center space-y-2">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <User className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-2xl font-bold">{rank.department}</span>
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('dashboard.department', 'Department')}</span>
                        </div>
                    </div>

                    <div className="text-center pt-2">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                            {t('dashboard.level', 'Level')} {level}
                        </div>
                        <p className="text-sm text-muted-foreground italic mt-2">{t('dashboard.keepReporting', '"Keep reporting to climb higher!"')}</p>
                    </div>
                </Card>

                {/* Achievements Card */}
                <Card className="p-6 space-y-6 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/achievements')}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-500" />
                            <h3 className="font-medium text-lg">{t('dashboard.myAchievements', 'My Achievements')}</h3>
                        </div>
                        <button className="text-sm text-primary hover:underline">{t('dashboard.viewAll', 'View All')} &gt;</button>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium text-foreground">{points}</span>
                        <span>{t('dashboard.points', 'points')}</span>
                        <span className="px-1">•</span>
                        <span>{earnedBadgesCount} {t('dashboard.badgesEarned', 'badges earned')}</span>
                    </div>

                    {/* Collected Badges */}
                    {earnedBadgesCount > 0 && (
                        <div className="space-y-3">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.collectedBadges', 'Collected Badges')}</span>
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {badges.filter(b => b.unlocked).map((badge) => (
                                    <div key={badge.id} className="flex-shrink-0 flex flex-col items-center gap-1 min-w-[70px] group/badge" title={badge.description}>
                                        <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center text-2xl shadow-sm border border-yellow-200 dark:border-yellow-900 group-hover/badge:scale-110 transition-transform">
                                            {badge.icon}
                                        </div>
                                        <span className="text-[10px] font-medium text-center leading-tight max-w-[80px] line-clamp-2">{badge.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Next Badge Goal */}
                    {nextBadge ? (
                        <div className="pt-2 border-t">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-medium text-muted-foreground">{t('dashboard.nextGoal', 'Next Goal')}</span>
                                <span className="text-xs font-medium text-primary">{nextBadge.name}</span>
                            </div>
                            <div className="bg-muted/30 p-3 rounded-xl flex items-center gap-3">
                                <div className="p-2 bg-background rounded-lg border shadow-sm grayscale opacity-70">
                                    <div className="w-5 h-5 flex items-center justify-center text-lg">{nextBadge.icon}</div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">{t('dashboard.progress', 'Progress')}</span>
                                        <span className="font-medium">{Math.round(progressPercent)}%</span>
                                    </div>
                                    <Progress value={progressPercent} className="h-1.5" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 bg-green-50 text-green-700 rounded-lg text-center text-xs font-medium">
                            🎉 {t('dashboard.allBadgesUnlocked', 'All badges unlocked!')}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
