import MemberLayout from "@/components/dashboard/MemberLayout";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Trophy, Crown, Flame, ArrowUp, ArrowDown, Minus, Clock, Globe, Users, Filter, Zap, Medal, Star
} from "lucide-react";
import { useLeaderboard, useMemberXP, getTier, RANKS, TIERS, TierName } from "@/hooks/useChallenges";
import { useMemberData } from "@/hooks/useMemberData";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import MemberHeroCard from "@/components/member/MemberHeroCard";
import { useGymAccess } from "@/hooks/useGymAccess";
import FeatureLock from "@/components/FeatureLock";

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2);

const podiumColors = {
  1: { border: "border-glow-gold/60", bg: "bg-glow-gold/15", initials: "text-glow-gold", numColor: "text-glow-gold", pillarBg: "bg-gradient-to-t from-glow-gold/5 to-glow-gold/20 border-glow-gold/30", crown: "text-glow-gold", xpColor: "text-glow-gold", glow: "from-glow-gold/30 to-glow-gold/5" },
  2: { border: "border-slate-300/50", bg: "bg-slate-300/10", initials: "text-slate-300", numColor: "text-slate-300/70", pillarBg: "bg-gradient-to-t from-slate-400/5 to-slate-300/15 border-slate-300/25", crown: "text-slate-300", xpColor: "text-slate-300", glow: "from-slate-300/20 to-slate-300/5" },
  3: { border: "border-amber-600/50", bg: "bg-amber-700/10", initials: "text-amber-500", numColor: "text-amber-600/60", pillarBg: "bg-gradient-to-t from-amber-700/5 to-amber-600/15 border-amber-600/25", crown: "text-amber-600", xpColor: "text-amber-500", glow: "from-amber-600/20 to-amber-600/5" },
};

const PodiumAvatar = ({ name, rank, xp, delay, isFirst, isEmpty }: { name: string; rank: number; xp: number; delay: number; isFirst?: boolean; isEmpty?: boolean }) => {
  const sizes = isFirst
    ? { avatar: "w-16 h-16", text: "text-lg", pillar: "h-28", num: "text-4xl" }
    : { avatar: "w-12 h-12", text: "text-sm", pillar: rank === 2 ? "h-20" : "h-14", num: "text-2xl" };

  const colors = podiumColors[rank as 1 | 2 | 3] || podiumColors[3];

  if (isEmpty) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 0.4, y: 0 }}
        transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`flex flex-col items-center flex-1 ${isFirst ? "max-w-[130px]" : "max-w-[100px]"}`}
      >
        <div className="relative mb-2">
          <div className={`relative ${sizes.avatar} rounded-full bg-secondary/20 border-2 border-dashed border-border/30 flex items-center justify-center`}>
            <span className="text-muted-foreground/30 text-xs font-medium">—</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/40 font-medium">Empty</p>
        <div className="w-full mt-2">
          <div className={`${sizes.pillar} rounded-t-2xl flex items-center justify-center border border-dashed border-border/20 bg-secondary/10`}>
            <span className={`font-display ${sizes.num} font-black text-muted-foreground/20`}>{rank}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center flex-1 ${isFirst ? "max-w-[130px]" : "max-w-[100px]"}`}
    >
      {/* Crown for all top 3 */}
      <motion.div
        animate={{ y: [0, -4, 0], rotate: [0, 3, -3, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="mb-1.5"
      >
        <Crown className={`${isFirst ? "w-6 h-6" : "w-4 h-4"} ${colors.crown} drop-shadow-[0_0_8px_currentColor]`} />
      </motion.div>

      <div className="relative mb-2">
        <div className={`absolute -inset-1.5 rounded-full bg-gradient-to-br ${colors.glow} ${isFirst ? "animate-pulse" : ""}`} />
        <div className={`relative ${sizes.avatar} rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center backdrop-blur-md`}>
          <span className={`font-display ${sizes.text} font-bold ${colors.initials}`}>
            {getInitials(name)}
          </span>
        </div>
      </div>

      <p className={`${isFirst ? "text-sm font-bold" : "text-xs font-semibold"} text-center truncate w-full`}>
        {name.split(" ")[0]}
      </p>
      <div className="flex items-center gap-1 mt-0.5">
        <Zap className={`w-2.5 h-2.5 ${colors.xpColor}`} />
        <span className={`text-[10px] font-mono font-bold ${colors.xpColor}`}>
          {xp.toLocaleString()}
        </span>
      </div>

      <div className="w-full mt-2">
        <div className={`${sizes.pillar} rounded-t-2xl flex items-center justify-center border backdrop-blur-sm ${colors.pillarBg} relative overflow-hidden`}>
          {isFirst && (
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-glow-gold/5 to-glow-gold/10 animate-pulse" />
          )}
          <span className={`font-display ${sizes.num} font-black ${colors.numColor} relative z-10 drop-shadow-lg`}>
            {rank}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const MemberLeaderboard = () => {
  const { access, isLoading: accessLoading } = useGymAccess();
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [scope, setScope] = useState<"gym" | "global">("gym");
  const [tierFilter, setTierFilter] = useState<TierName | "all">("all");
  const { gym } = useMemberData();
  const { xp, level, tier: currentTier } = useMemberXP();

  if (accessLoading) {
    return (
      <MemberLayout title="Leaderboard" subtitle="Compete with your gym mates">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MemberLayout>
    );
  }

  if (!access.features.member_app_premium) {
    return (
      <MemberLayout title="Leaderboard" subtitle="Compete with your gym mates">
        <FeatureLock
          title="Leaderboard Locked"
          description="Your gym is not on the Pro plan. Ask your gym owner to upgrade to unlock leaderboards."
          showCta={false}
        />
      </MemberLayout>
    );
  }

  const { data: dbLeaderboard = [], isLoading } = useLeaderboard(
    scope,
    period,
    tierFilter === "all" ? undefined : tierFilter
  );

  const leaderboard = dbLeaderboard;

  const currentUserRank = useMemo(() => {
    const index = leaderboard.findIndex(p => p.isCurrentUser);
    return index >= 0 ? index + 1 : null;
  }, [leaderboard]);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const getTimeUntilReset = () => {
    const now = new Date();
    if (period === "weekly") {
      const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
      return `${daysUntilSunday}d ${24 - now.getHours()}h`;
    }
    return `${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()}d`;
  };

  return (
    <MemberLayout title="Leaderboard" subtitle="Compete with your gym mates">
      <MemberHeroCard
        eyebrow="Leaderboard"
        title="Climb The Rankings"
        subtitle="Track your placement, streak, and XP against other members."
        gymName={scope === "gym" ? gym?.name : "Global Arena"}
        chips={[
          { label: `${period} cycle`, icon: <Clock className="w-3.5 h-3.5" />, tone: "muted" },
          { label: `Level ${level}`, tone: "primary" },
          { label: `${xp.toLocaleString()} XP`, icon: <Zap className="w-3.5 h-3.5" />, tone: "success" },
        ]}
        className="mb-6"
      />

      {/* ── CONTROLS ── */}
      <div className="space-y-3 mb-10 sm:mb-8 overflow-x-hidden">
        {/* Main controls row: Period left, Scope+Filter right */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Period toggle - left */}
          <div className="inline-flex bg-card/80 backdrop-blur-xl border border-border/40 rounded-xl p-0.5 shadow-elevated">
            {(["weekly", "monthly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`relative px-3 sm:px-5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
                  period === p ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {period === p && (
                  <motion.div
                    layoutId="leaderboardPeriod"
                    className="absolute inset-0 bg-gradient-primary rounded-lg glow-shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 capitalize">{p}</span>
              </button>
            ))}
          </div>

          {/* Scope + Filter - right */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="inline-flex bg-card/80 backdrop-blur-xl border border-border/40 rounded-xl p-0.5 shadow-elevated">
              {(["gym", "global"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`relative px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all flex items-center gap-1 ${
                    scope === s ? "text-primary bg-primary/10 border border-primary/20" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "gym" ? <Users className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                  <span className="hidden min-[360px]:inline">{s === "gym" ? "My Gym" : "Global"}</span>
                </button>
              ))}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 border-border/40 bg-card/80 backdrop-blur-xl px-2 sm:px-2.5 shadow-elevated">
                  <Filter className="w-3 h-3" />
                  <span className="hidden min-[360px]:inline">{tierFilter === "all" ? "All" : tierFilter}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border-border/40 shadow-luxury">
                <DropdownMenuItem onClick={() => setTierFilter("all")}>All Ranks</DropdownMenuItem>
                {RANKS.map(t => (
                  <DropdownMenuItem key={t.name} onClick={() => setTierFilter(t.name)}>
                    <span className="mr-2">{t.emoji}</span>
                    <span className={t.color}>{t.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Countdown - centered below */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 bg-card/60 backdrop-blur-xl border border-border/30 rounded-full px-3.5 py-1 shadow-elevated">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <Clock className="w-3 h-3 text-primary/70" />
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">
              Resets in <span className="text-foreground font-semibold">{getTimeUntilReset()}</span>
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="flex justify-center gap-3 mb-8">
            {[1, 2, 3].map(i => <Skeleton key={i} className="w-24 h-40 rounded-2xl" />)}
          </div>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* ── PODIUM ── */}
          {top3.length >= 1 && (
            <div className="relative mb-6">
              {/* Ambient glow orbs */}
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-glow-gold/6 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />

              <div className="flex items-end justify-center gap-3 relative z-10 px-4">
                {top3[1] ? (
                  <PodiumAvatar name={top3[1].name} rank={2} xp={top3[1].xp} delay={0.3} />
                ) : (
                  <PodiumAvatar name="" rank={2} xp={0} delay={0.3} isEmpty />
                )}
                <PodiumAvatar name={top3[0].name} rank={1} xp={top3[0].xp} delay={0.15} isFirst />
                {top3[2] ? (
                  <PodiumAvatar name={top3[2].name} rank={3} xp={top3[2].xp} delay={0.4} />
                ) : (
                  <PodiumAvatar name="" rank={3} xp={0} delay={0.4} isEmpty />
                )}
              </div>
            </div>
          )}

          {/* ── RANK LIST ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="bg-card/50 backdrop-blur-xl border border-border/30 rounded-2xl overflow-hidden shadow-luxury"
          >
            {/* Header */}
            <div className="px-3 sm:px-5 py-3 border-b border-border/20 bg-card/40">
              <div className="flex items-center text-[9px] sm:text-[10px] text-muted-foreground/70 uppercase tracking-[0.15em] font-semibold">
                <span className="w-8 sm:w-10">#</span>
                <span className="flex-1">Player</span>
                <span className="w-14 sm:w-16 text-right">Streak</span>
                <span className="w-14 sm:w-20 text-right">XP</span>
              </div>
            </div>

            {/* Top 3 rows with crowns */}
            <div className="divide-y divide-border/10">
              {leaderboard.slice(0, 3).map((player, i) => {
                const playerTier = getTier(player.level);
                const rankColor = i === 0 ? "text-glow-gold" : i === 1 ? "text-slate-300" : "text-amber-500";
                const crownColor = i === 0 ? "text-glow-gold" : i === 1 ? "text-slate-300" : "text-amber-600";

                return (
                  <motion.div
                    key={player.memberId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.04, duration: 0.4 }}
                    className={`group flex items-center px-3 sm:px-5 py-3.5 sm:py-4 transition-all duration-300 ${
                      player.isCurrentUser
                        ? "bg-primary/[0.06] border-l-2 border-l-primary"
                        : "hover:bg-card/60 border-l-2 border-l-transparent"
                    }`}
                  >
                    <span className={`w-8 sm:w-10 font-display font-black text-base sm:text-lg ${rankColor} shrink-0`}>
                      {player.rank}
                    </span>

                    <div className="flex-1 flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-[11px] sm:text-xs font-bold shrink-0 transition-all ${
                        player.isCurrentUser
                          ? "bg-gradient-primary text-primary-foreground glow-shadow-sm"
                          : "bg-secondary/60 text-muted-foreground border border-border/20"
                      }`}>
                        {getInitials(player.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Crown className={`w-3.5 h-3.5 ${crownColor} shrink-0`} />
                          <p className="text-[13px] sm:text-sm font-bold truncate leading-tight">
                            {player.name}
                          </p>
                          {player.isCurrentUser && (
                            <span className="text-[9px] sm:text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">You</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] sm:text-[11px] text-muted-foreground/70">
                            {player.challengesCompleted || 0} quests
                          </span>
                          <span className="text-border/50">•</span>
                          <span className={`text-[10px] sm:text-[11px] ${playerTier.color} flex items-center gap-0.5`}>
                            {playerTier.emoji} {playerTier.name}
                          </span>
                          <span className="text-border/50 hidden sm:inline">•</span>
                          <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">Lv.{player.level}</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-14 sm:w-16 flex items-center justify-end gap-1 shrink-0">
                      <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-glow-gold/80" />
                      <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">{player.streak}</span>
                    </div>

                    <div className="w-14 sm:w-20 text-right shrink-0">
                      <span className={`font-mono font-bold text-[13px] sm:text-sm ${rankColor}`}>
                        {player.xp.toLocaleString()}
                      </span>
                      <p className="text-[8px] sm:text-[9px] text-muted-foreground/50 uppercase tracking-wider">XP</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Divider between top 3 and rest */}
            {rest.length > 0 && (
              <div className="px-4 sm:px-5 py-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-border/40 to-transparent" />
                  <span className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-semibold">Others</span>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-border/40 to-transparent" />
                </div>
              </div>
            )}

            {/* Rest of leaderboard */}
            <div className="divide-y divide-border/10">
              {rest.map((player, i) => {
                const playerTier = getTier(player.level);

                return (
                  <motion.div
                    key={player.memberId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.04, duration: 0.4 }}
                    className={`group flex items-center px-3 sm:px-5 py-3 sm:py-3.5 transition-all duration-300 ${
                      player.isCurrentUser
                        ? "bg-primary/[0.06] border-l-2 border-l-primary"
                        : "hover:bg-card/60 border-l-2 border-l-transparent"
                    }`}
                  >
                    <span className="w-8 sm:w-10 font-display font-black text-sm sm:text-base text-foreground/60 shrink-0">
                      {player.rank}
                    </span>

                    <div className="flex-1 flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-[11px] sm:text-xs font-bold shrink-0 transition-all ${
                        player.isCurrentUser
                          ? "bg-gradient-primary text-primary-foreground glow-shadow-sm"
                          : "bg-secondary/60 text-muted-foreground border border-border/20"
                      }`}>
                        {getInitials(player.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] sm:text-sm font-semibold truncate leading-tight">
                            {player.name}
                          </p>
                          {player.isCurrentUser && (
                            <span className="text-[9px] sm:text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">You</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] sm:text-[11px] text-muted-foreground/70">
                            {player.challengesCompleted || 0} quests
                          </span>
                          <span className="text-border/50">•</span>
                          <span className={`text-[10px] sm:text-[11px] ${playerTier.color} flex items-center gap-0.5`}>
                            {playerTier.emoji} {playerTier.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="w-14 sm:w-16 flex items-center justify-end gap-1 shrink-0">
                      <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-glow-gold/80" />
                      <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">{player.streak}</span>
                    </div>

                    <div className="w-14 sm:w-20 text-right shrink-0">
                      <span className="font-mono font-bold text-[13px] sm:text-sm text-foreground/90">
                        {player.xp.toLocaleString()}
                      </span>
                      <p className="text-[8px] sm:text-[9px] text-muted-foreground/50 uppercase tracking-wider">XP</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* ── YOUR RANK CARD ── */}
          {currentUserRank && currentUserRank > 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-4 mb-2 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-glow-cyan/8 to-primary/10 rounded-2xl" />
              <div className="absolute inset-0 border border-primary/20 rounded-2xl" />
              <div className="relative p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-display font-black text-base glow-shadow-sm">
                      #{currentUserRank}
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm">Your Position</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        Lv.{level}
                        <span className="text-border">•</span>
                        <span className={currentTier.color}>{currentTier.emoji} {currentTier.name}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Zap className="w-3.5 h-3.5 text-glow-gold" />
                      <p className="font-mono font-black text-lg text-foreground">{xp.toLocaleString()}</p>
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Total XP</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </MemberLayout>
  );
};

export default MemberLeaderboard;
