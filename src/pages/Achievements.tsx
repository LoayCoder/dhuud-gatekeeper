
import { useTranslation } from 'react-i18next';
import { EnterprisePage } from '@/components/layout/EnterprisePage';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useGamification } from '@/hooks/use-gamification';
import {
    Trophy,
    Award,
    Star,
    Shield,
    Zap,
    Target,
    Medal,
    Crown
} from 'lucide-react';

export default function Achievements() {
    const { t } = useTranslation();
    const { data: stats, isLoading } = useGamification();

    if (isLoading || !stats) {
        return (
            <EnterprisePage title="Achievements" description="Your HSSE Journey">
                <div className="animate-pulse space-y-4">
                    <div className="h-48 bg-muted/20 rounded-xl" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="h-32 bg-muted/20 rounded-xl" />
                        <div className="h-32 bg-muted/20 rounded-xl" />
                        <div className="h-32 bg-muted/20 rounded-xl" />
                    </div>
                </div>
            </EnterprisePage>
        );
    }

    const { level, totalPoints, nextLevelPoints, badges, rank, recentHistory } = stats;
    const progressPercent = Math.min(100, (totalPoints / nextLevelPoints) * 100);

    return (
        <EnterprisePage
            title="Achievements"
            description="Track your HSSE contributions and earn rewards"
            className="space-y-8"
        >
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-8 shadow-xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Trophy className="w-64 h-64" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                    {/* Level Ring */}
                    <div className="relative flex-shrink-0">
                        <div className="w-32 h-32 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                            <div className="text-center">
                                <span className="block text-xs uppercase tracking-widest opacity-80">Level</span>
                                <span className="block text-5xl font-bold">{level}</span>
                            </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-yellow-200">
                            {rank.company === 1 ? '🏆 Top 1' : `Rank #${rank.company}`}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div>
                            <h2 className="text-3xl font-bold">HSSE Champion</h2>
                            <p className="text-indigo-100">Keep up the great work! You are making a difference.</p>
                        </div>

                        <div className="space-y-2 max-w-md">
                            <div className="flex justify-between text-sm font-medium">
                                <span>{totalPoints} Points</span>
                                <span>{nextLevelPoints} Points</span>
                            </div>
                            <Progress value={progressPercent} className="h-3 bg-black/20" indicatorClassName="bg-yellow-400" />
                            <p className="text-xs text-indigo-200 text-right">{nextLevelPoints - totalPoints} points to Level {level + 1}</p>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl text-center min-w-[100px]">
                            <Start className="w-6 h-6 mx-auto mb-2 text-yellow-300" />
                            <div className="text-2xl font-bold">{badges.filter(b => b.unlocked).length}</div>
                            <div className="text-xs opacity-80">Badges</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl text-center min-w-[100px]">
                            <Target className="w-6 h-6 mx-auto mb-2 text-green-300" />
                            <div className="text-2xl font-bold">{totalPoints}</div>
                            <div className="text-xs opacity-80">Total Pts</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Badges Grid */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Medal className="w-5 h-5 text-primary" />
                    Badges Collection
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {badges.map((badge) => (
                        <Card
                            key={badge.id}
                            className={`p-6 flex flex-col items-center text-center space-y-4 transition-all hover:shadow-md ${!badge.unlocked ? 'opacity-60 grayscale' : 'border-primary/20 bg-primary/5'}`}
                        >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-sm ${badge.unlocked ? 'bg-white dark:bg-slate-800' : 'bg-muted'}`}>
                                {badge.icon}
                            </div>
                            <div>
                                <h4 className="font-bold">{badge.name}</h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{badge.description}</p>
                            </div>
                            {badge.unlocked ? (
                                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                    Unlocked
                                </span>
                            ) : (
                                <div className="w-full space-y-1">
                                    <div className="flex justify-between text-[10px] text-muted-foreground uppercase">
                                        <span>Progress</span>
                                        <span>{badge.progress} / {badge.totalRequired}</span>
                                    </div>
                                    <Progress value={(badge.progress / badge.totalRequired) * 100} className="h-1.5" />
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>

            {/* Point History */}
            <div className="grid gap-8 md:grid-cols-2">
                <Card className="p-6 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        Recent Activity
                    </h3>
                    <div className="space-y-4">
                        {recentHistory.map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                        +{item.points}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{item.action}</span>
                                        <span className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {recentHistory.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                        )}
                    </div>
                </Card>

                <Card className="p-6 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Crown className="w-5 h-5 text-orange-500" />
                        Leaderboard Position
                    </h3>
                    <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-xl text-center space-y-2 border border-orange-100 dark:border-orange-900/30">
                        <p className="text-muted-foreground">You are currently ranked</p>
                        <div className="text-4xl font-bold text-orange-600 dark:text-orange-400">#{rank.company}</div>
                        <p className="text-sm text-muted-foreground">in the entire company</p>
                        <div className="pt-4">
                            <p className="text-xs text-orange-600/80 italic">"Top 5% of contributors!"</p>
                        </div>
                    </div>
                </Card>
            </div>
        </EnterprisePage>
    );
}

function Start({ className }: { className?: string }) {
    return <Star className={className} fill="currentColor" stroke="none" />
}
