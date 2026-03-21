"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingDown, TrendingUp, Wallet, Download, Target, PieChart, Award, Zap, Calendar, Loader2, Bot } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { transactionService, authService } from "@/lib/localStorageService";
import { api } from "@/lib/api";
import { firestoreService } from "@/lib/firestoreService";

export default function InsightsPage() {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [aiSentiment, setAiSentiment] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState(true);

  useEffect(() => {
    async function fetchAiAdvice() {
      try {
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '').trim();
        if (!userId) return;

        const resTx = await firestoreService.getTransactions(userId, 500);
        const txns = resTx.success ? resTx.data : [];

        // Build a brief summary payload for the AI
        const categoryTotals: Record<string, number> = {};
        let totalSpent = 0;
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        txns.forEach((t: any) => {
            const d = new Date(t.date);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type !== 'credit') {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
                totalSpent += t.amount;
            }
        });

        const summaryData = {
            currentMonth: now.toLocaleString('default', { month: 'long' }),
            totalSpentThisMonth: totalSpent,
            spendByCategory: categoryTotals,
        };

        const res = await api.post('/budget-advice', { summary: summaryData });
        if (res.data?.status === "success" && res.data?.advice) {
            setAiInsights(res.data.advice.insights);
            setAiSentiment(res.data.advice.overall_sentiment);
        } else {
            throw new Error("Invalid response");
        }
      } catch (e: any) {
        console.error("AI Advice extraction failed", e);
        // Fallback UI
        setAiInsights([
            "Try categorizing more past transactions to uncover better trends.",
            "Set a monthly target to avoid overspending in discretionary categories."
        ]);
        setAiSentiment("Good");
      } finally {
        setIsLoadingAi(false);
      }
    }
    fetchAiAdvice();
  }, []);

  const handleExportInsights = () => {
    toast.success("Insights exported successfully!", {
      description: "Your financial insights have been downloaded as PDF",
    });
  };

  const handleSetGoal = () => {
    toast.info("Goal setting feature", {
      description: "Set your monthly spending goals and track progress",
    });
  };

  const handleCompareMonths = () => {
    toast.info("Month comparison", {
      description: "Compare spending patterns across different months",
    });
  };

  const handleCategoryDeepDive = () => {
    toast.info("Category analysis", {
      description: "Detailed breakdown of spending by category",
    });
  };

  const quickActions = [
    {
      icon: Download,
      label: "Export Insights",
      description: "Download as PDF/CSV",
      color: "from-blue-500 to-cyan-500",
      action: handleExportInsights,
    },
    {
      icon: Target,
      label: "Set Goal",
      description: "Monthly spending targets",
      color: "from-purple-500 to-pink-500",
      action: handleSetGoal,
    },
    {
      icon: Calendar,
      label: "Compare Months",
      description: "Month-over-month analysis",
      color: "from-orange-500 to-red-500",
      action: handleCompareMonths,
    },
    {
      icon: PieChart,
      label: "Deep Dive",
      description: "Category breakdown",
      color: "from-emerald-500 to-teal-500",
      action: handleCategoryDeepDive,
    },
  ];

  const achievements = [
    { icon: Award, label: "5-Day Streak", description: "Logged in 5 days in a row" },
    { icon: TrendingDown, label: "Spending Down", description: "20% less than last month" },
    { icon: Zap, label: "Quick Learner", description: "Categorized 50+ transactions" },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Smart insights
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            A quick snapshot of how TransactAI reads your recent spending.
          </p>
        </div>
      </motion.div>

      {/* AI Budget Advisor */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="border-2 border-indigo-100 dark:border-indigo-900 shadow-md bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Bot className="h-24 w-24 text-indigo-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <Sparkles className="h-5 w-5" />
              AI Budget Advisor
              {!isLoadingAi && aiSentiment && (
                <span className={`ml-auto text-xs px-2 py-1 rounded-full font-medium ${
                    aiSentiment.toLowerCase().includes('warn') || aiSentiment.toLowerCase().includes('crit') 
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                }`}>
                  Status: {aiSentiment}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAi ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Analyzing your recent spending patterns...</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {aiInsights.map((insight, idx) => (
                  <motion.li 
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + (idx * 0.1) }}
                    className="flex items-start gap-3 bg-white/50 dark:bg-gray-900/50 p-3 rounded-md text-sm border border-indigo-50 dark:border-indigo-900/50"
                  >
                    <div className="shrink-0 mt-0.5 h-4 w-4 rounded-full bg-indigo-500 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium leading-snug">{insight}</span>
                  </motion.li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Quick Actions
        </h3>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                className={`h-auto flex flex-col items-center gap-2 p-4 w-full border-2 hover:border-primary transition-all bg-gradient-to-br ${action.color} bg-clip-padding hover:shadow-lg group`}
                onClick={action.action}
              >
                <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-lg group-hover:shadow-xl transition-shadow`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </Button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          Your Achievements
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {achievements.map((achievement, index) => (
            <motion.div
              key={achievement.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 hover:shadow-lg transition-all">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg shadow-md">
                    <achievement.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{achievement.label}</p>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Original Insights Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
          <Card className="h-full border border-border/60 shadow-sm hover:shadow-xl transition-all bg-gradient-to-br from-background via-background to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="h-5 w-5 text-primary" />
                Spend focus
              </CardTitle>
              <CardDescription>
                Categories where most of your rupees are going this month.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <motion.div
                className="flex items-center justify-between p-2 rounded-lg hover:bg-primary/5 transition-colors"
                whileHover={{ x: 5 }}
              >
                <span>Shopping & lifestyle</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-red-500" />
                  likely high
                </span>
              </motion.div>
              <motion.div
                className="flex items-center justify-between p-2 rounded-lg hover:bg-primary/5 transition-colors"
                whileHover={{ x: 5 }}
              >
                <span>Food & dining</span>
                <span className="font-semibold text-foreground">steady</span>
              </motion.div>
              <motion.div
                className="flex items-center justify-between p-2 rounded-lg hover:bg-primary/5 transition-colors"
                whileHover={{ x: 5 }}
              >
                <span>Transport & fuel</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-orange-500" />
                  slightly up
                </span>
              </motion.div>
              <p className="text-[11px] mt-2">
                Numbers are based on your latest simulated transactions and will adapt as you
                keep using TransactAI.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
          <Card className="h-full border border-border/60 shadow-sm hover:shadow-xl transition-all bg-gradient-to-br from-background via-background to-emerald-50/50 dark:to-emerald-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingDown className="h-5 w-5 text-emerald-500" />
                Easy wins
              </CardTitle>
              <CardDescription>
                Places where a small tweak can free up monthly cash flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-none space-y-2">
                <motion.li
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                  whileHover={{ x: 5 }}
                >
                  <Sparkles className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Review subscriptions (OTT, music) that you rarely use.</span>
                </motion.li>
                <motion.li
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                  whileHover={{ x: 5 }}
                >
                  <Sparkles className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Group online orders to avoid multiple delivery charges.</span>
                </motion.li>
                <motion.li
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                  whileHover={{ x: 5 }}
                >
                  <Sparkles className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Move predictable bills to one auto‑pay day to avoid late fees.</span>
                </motion.li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
          <Card className="h-full border border-border/60 shadow-sm hover:shadow-xl transition-all bg-gradient-to-br from-background via-background to-amber-50/60 dark:to-amber-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                Upcoming nudges
              </CardTitle>
              <CardDescription>
                How TransactAI can help when insights toggles are enabled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <motion.div
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                whileHover={{ x: 5 }}
              >
                <Sparkles className="h-4 w-4 mt-0.5 text-primary" />
                <p>Surface a weekly card if any category jumps more than usual.</p>
              </motion.div>
              <motion.div
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                whileHover={{ x: 5 }}
              >
                <Sparkles className="h-4 w-4 mt-0.5 text-primary" />
                <p>Tag potential "one‑time" spends so your monthly view stays realistic.</p>
              </motion.div>
              <p className="text-[11px] mt-1">
                These are experience options only; no bank credentials are stored in TransactAI.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}


