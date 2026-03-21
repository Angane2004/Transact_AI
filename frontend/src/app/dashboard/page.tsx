"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authService } from "@/lib/localStorageService";
import { api } from "@/lib/api";
import { AddCategoryDialog } from "@/components/AddCategoryDialog";
import { CategoriesDialog } from "@/components/CategoriesDialog";
import { TransactionList } from "@/components/TransactionList";
import { DashboardCharts } from "@/components/DashboardCharts";
import { PasteSmsDialog } from "@/components/PasteSmsDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IndianRupee, CreditCard, Activity, TrendingUp, Sparkles, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import Link from "next/link";
import { pinService } from "@/lib/localStorageService";
import { useDensity } from "@/lib/DensityContext";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

type TimePeriod = "today" | "weekly" | "monthly" | "yearly";

export default function DashboardPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timePeriod, setTimePeriod] = useState<TimePeriod>("today");
    const [categories, setCategories] = useState<string[]>([]);
    const [showCategories, setShowCategories] = useState(false);
    const [showPinReminder, setShowPinReminder] = useState(false);
    const { theme } = useTheme();
    const { density, getDensityClasses } = useDensity();
    const densityClasses = getDensityClasses();

    useEffect(() => {
        // Check if PIN is set
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '');
        if (userId) {
            const hasPin = pinService.exists(userId);
            setShowPinReminder(!hasPin);
        }
    }, []);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [summaryRes, transRes] = await Promise.all([
                api.get('/summary'),
                api.get('/transactions', { params: { limit: 10 } })
            ]);

            setSummary(summaryRes.data);
            setTransactions(transRes.data.results);
        } catch (error: any) {
            console.error("Connectivity issue or empty account:", error);
            // Gracefully fallback to empty state without intrusive "dummy" alerts
            setTransactions([]);
            setSummary({
                total_spent: 0,
                total_transactions: 0,
                category_summary: {},
                highest_spending_category: null,
            });
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCategoryAdded = useCallback(() => {
        fetchData();
    }, [fetchData]);

    const categoryCount = useMemo(() => {
        return Object.keys(summary?.category_summary || {}).length;
    }, [summary]);

    if (loading && !summary) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground font-medium">Synchronizing with cloud...</p>
                </div>
            </div>
        );
    }

    // Empty State UI
    if (summary?.total_transactions === 0) {
        return (
            <div className={`flex-1 ${densityClasses.spacing} p-4 md:p-8 pt-6 min-h-screen flex flex-col`}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
                >
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Welcome to TransactAI
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            Your journey to financial clarity starts here
                        </p>
                    </div>
                </motion.div>

                <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto text-center space-y-8">
                     <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative"
                     >
                        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                        <div className="relative p-8 bg-background border-2 border-dashed border-muted-foreground/20 rounded-3xl">
                            <Activity className="h-20 w-20 text-primary mx-auto mb-6 opacity-40" />
                            <h3 className="text-2xl font-bold mb-2">No Transactions Yet</h3>
                            <p className="text-muted-foreground max-w-sm">
                                Paste your latest bank SMS or add a category to see your financial insights come to life.
                            </p>
                        </div>
                     </motion.div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                        <Card className="hover:border-primary transition-colors cursor-pointer group" onClick={() => (document.querySelector('[data-sms-trigger]') as HTMLElement)?.click()}>
                            <CardContent className="pt-6 text-center">
                                <Sparkles className="h-10 w-10 text-blue-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                <h4 className="font-bold mb-1">Paste Bank SMS</h4>
                                <p className="text-xs text-muted-foreground">Extract details automatically using AI</p>
                                <div className="mt-4 hidden"><PasteSmsDialog onTransactionAdded={fetchData} /></div>
                            </CardContent>
                        </Card>
                        <Card className="hover:border-primary transition-colors cursor-pointer group" onClick={() => (document.querySelector('[data-cat-trigger]') as HTMLElement)?.click()}>
                            <CardContent className="pt-6 text-center">
                                <Activity className="h-10 w-10 text-purple-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                <h4 className="font-bold mb-1">Add Categories</h4>
                                <p className="text-xs text-muted-foreground">Customize your spending buckets</p>
                                <div className="mt-4 hidden"><AddCategoryDialog onCategoryAdded={handleCategoryAdded} /></div>
                            </CardContent>
                        </Card>
                     </div>

                     <div className="flex gap-4 items-center">
                        <div className="h-[2px] w-20 bg-muted" />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Quick Start</span>
                        <div className="h-[2px] w-20 bg-muted" />
                     </div>

                     <div className="flex flex-wrap justify-center gap-3">
                        <div data-sms-trigger><PasteSmsDialog onTransactionAdded={fetchData} /></div>
                        <div data-cat-trigger><AddCategoryDialog onCategoryAdded={handleCategoryAdded} /></div>
                     </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex-1 ${densityClasses.spacing} p-4 md:p-8 pt-6 min-h-screen`}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Dashboard
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Welcome back! Here's your financial overview
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <PasteSmsDialog onTransactionAdded={fetchData} />
                    <AddCategoryDialog onCategoryAdded={handleCategoryAdded} />
                    <Link href="/dashboard/transactions">
                        <Button variant="outline">
                            View All Transactions
                        </Button>
                    </Link>
                </div>
            </motion.div>

            {/* PIN Reminder Banner */}
            {showPinReminder && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-center justify-between gap-4"
                >
                    <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                            <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                                Add PIN lock to secure your app
                            </h3>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                Set up a 4-digit PIN in Settings to protect your financial data
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard/settings">
                            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                                Setup PIN
                            </Button>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setShowPinReminder(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Categories Dialog */}
            <CategoriesDialog
                open={showCategories}
                onOpenChange={setShowCategories}
                categories={categories}
            />

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            >
                <motion.div variants={item}>
                    <Card className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500 dark:border-l-blue-400">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Spent
                            </CardTitle>
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
                            >
                                <IndianRupee className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </motion.div>
                        </CardHeader>
                        <CardContent>
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="text-2xl md:text-3xl font-bold"
                            >
                                ₹{summary?.total_spent?.toFixed(2) || "0.00"}
                            </motion.div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {timePeriod === 'today' ? 'Today' :
                                    timePeriod === 'monthly' ? 'Last month' :
                                        timePeriod === 'weekly' ? 'Last 7 days' : 'This year'}
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500 dark:border-l-green-400">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Transactions
                            </CardTitle>
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: -5 }}
                                className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"
                            >
                                <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </motion.div>
                        </CardHeader>
                        <CardContent>
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="text-2xl md:text-3xl font-bold"
                            >
                                {summary?.total_transactions || 0}
                            </motion.div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Total processed transactions
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-purple-500 dark:border-l-purple-400">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Top Category
                            </CardTitle>
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"
                            >
                                <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </motion.div>
                        </CardHeader>
                        <CardContent>
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="text-xl md:text-2xl font-bold truncate"
                            >
                                {summary?.highest_spending_category || "N/A"}
                            </motion.div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Highest spending category
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card
                        className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-orange-500 dark:border-l-orange-400 cursor-pointer"
                        onClick={() => setShowCategories(!showCategories)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Categories
                            </CardTitle>
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: -5 }}
                                className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg"
                            >
                                <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </motion.div>
                        </CardHeader>
                        <CardContent>
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="text-2xl md:text-3xl font-bold"
                            >
                                {categoryCount}
                            </motion.div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Click to view all categories
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                {summary && (
                    <DashboardCharts
                        data={summary}
                        timePeriod={timePeriod}
                        onTimePeriodChange={setTimePeriod}
                    />
                )}
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid gap-4"
            >
                <TransactionList transactions={transactions} />
            </motion.div>
        </div>
    );
}
