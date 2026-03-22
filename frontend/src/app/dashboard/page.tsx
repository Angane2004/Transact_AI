"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authService, transactionService, cacheService } from "@/lib/localStorageService";
import { api } from "@/lib/api";
import { AddCategoryDialog } from "@/components/AddCategoryDialog";
import { CategoriesDialog } from "@/components/CategoriesDialog";
import { TransactionList } from "@/components/TransactionList";
import { DashboardCharts } from "@/components/DashboardCharts";
import { PasteSmsDialog } from "@/components/PasteSmsDialog";
import { SmsRealtimeHint } from "@/components/SmsRealtimeHint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IndianRupee, CreditCard, Activity, TrendingUp, Sparkles, Lock, X, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import Link from "next/link";
import { pinService } from "@/lib/localStorageService";
import { useDensity } from "@/lib/DensityContext";
import { firestoreService } from "@/lib/firestoreService";
import { fetchTransactionsFromApi, mergeTransactionLists } from "@/lib/backendTransactions";
import { useSmsListener } from "@/hooks/useSmsListener";
import { TransactionCategorizeNotification } from "@/components/TransactionCategorizeNotification";

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
    const [pendingTransaction, setPendingTransaction] = useState<any>(null);
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

    const syncPendingTransactions = useCallback(async (userId: string | undefined) => {
        const pending = transactionService.getPendingSync(userId);
        if (pending.length === 0) return;

        console.log(`🔄 Syncing ${pending.length} pending transactions...`);
        let syncedCount = 0;

        for (const txn of pending) {
            try {
                // Try to classify and save to backend
                const res = await api.post("/classify", { message: txn.description });
                if (res.data.status === "saved" || res.data.status === "low_confidence") {
                    transactionService.markAsSynced(txn.id, userId);
                    
                    // Also sync to Firestore
                    if (userId) {
                        firestoreService.saveTransaction(userId, {
                            ...txn,
                            amount: res.data.amount || txn.amount,
                            category: res.data.status === "saved" ? res.data.category : txn.category,
                            status: "completed"
                        });
                    }
                    
                    syncedCount++;
                }
            } catch (e) {
                console.error(`Failed to sync txn ${txn.id}:`, e);
                break; // Stop syncing if connection is lost again
            }
        }

        if (syncedCount > 0) {
            toast.success(`Synced ${syncedCount} offline transactions!`);
            return true;
        }
        return false;
    }, []);

    const fetchData = useCallback(async (force: boolean = false) => {
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '').trim();

        if (!userId) return;

        try {
            setLoading(true);
            
            // 1. Fetch from Firestore and merge with backend API (Render DB) so pasted SMS appears even without Firebase
            const transRes = await firestoreService.getTransactions(userId, 500);
            const fromFirestore = transRes.success ? transRes.data : [];
            const fromApi = await fetchTransactionsFromApi();
            const allFetchedTransactions = mergeTransactionLists(fromFirestore, fromApi);
            
            // For the transaction list, we only show the latest 10
            setTransactions(allFetchedTransactions.slice(0, 10));

            // Check for any pending transactions that need categorization
            const pending = allFetchedTransactions.find((t: any) => t.status === 'pending');
            if (pending) {
                setPendingTransaction(pending);
            } else {
                setPendingTransaction(null);
            }

            // 2. Fetch Categories from Firestore
            const catRes = await firestoreService.getCategories(userId);
            const fetchedCategories = catRes.success ? catRes.data : [];
            setCategories(fetchedCategories);

            // 3. Calculate Summary Locally from ALL fetched transactions for accuracy
            const totalSpent = allFetchedTransactions
                .filter((t: any) => t.type === 'debit')
                .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
            
            const categorySummary: Record<string, number> = {};
            allFetchedTransactions.forEach((t: any) => {
                if (t.category && t.type === 'debit') {
                    categorySummary[t.category] = (categorySummary[t.category] || 0) + (t.amount || 0);
                }
            });

            const sortedCategories = Object.entries(categorySummary).sort((a: any, b: any) => b[1] - a[1]);
            const highestCat = sortedCategories.length > 0 ? sortedCategories[0][0] : "N/A";

            const newSummary = {
                total_spent: totalSpent,
                total_transactions: allFetchedTransactions.length,
                category_summary: categorySummary,
                highest_spending_category: highestCat,
            };

            setSummary(newSummary);

            // Sync Cache
            cacheService.saveSummary(newSummary, userId);
            // We only save to local transaction cache if we are NOT forcing a cloud refresh
            if (!force) {
                transactionService.saveMany(allFetchedTransactions, userId);
            }

        } catch (error: any) {
            console.error("Connectivity issue or empty account:", error);
            
            // Fallback to cache
            const cachedSummary = cacheService.getSummary(userId);
            const cachedTransactions = transactionService.getAll(userId).slice(0, 10);

            if (cachedSummary) {
                setSummary(cachedSummary);
                setTransactions(cachedTransactions);
            }
        } finally {
            setLoading(false);
        }
    }, [syncPendingTransactions]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Activate Real-time SMS Listener (Native Only)
    useSmsListener(fetchData);

    const handleCategoryAdded = useCallback(() => {
        fetchData(true);
    }, [fetchData]);

    const handleTransactionAdded = useCallback(() => {
        // Small delay to allow Firestore to propagate the write before we fetch
        setTimeout(() => {
            fetchData(true);
        }, 800);
    }, [fetchData]);

    const handleCategorized = async (category: string) => {
        if (!pendingTransaction) return;
        
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '').trim();
        if (!userId) return;

        try {
            const res = await firestoreService.updateTransaction(userId, pendingTransaction.id, {
                category: category,
                status: 'completed'
            });
            
            if (res.success) {
                toast.success(`Transaction categorized as ${category}`);
                setPendingTransaction(null);
                fetchData(); // Refresh all data
            } else {
                toast.error("Failed to update cloud transaction");
            }
        } catch (error) {
            console.error("Categorization error:", error);
            toast.error("An error occurred while categorizing");
        }
    };

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
                        <div data-sms-trigger><PasteSmsDialog onTransactionAdded={handleTransactionAdded} /></div>
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
                    <div className="flex items-center gap-2">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Dashboard
                        </h2>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-[10px] font-bold text-green-600 dark:text-green-400 animate-pulse">
                            <Zap className="h-2.5 w-2.5" />
                            REAL-TIME LINK ACTIVE
                        </div>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        Welcome back! Here's your financial overview
                    </p>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => void fetchData()} 
                        disabled={loading}
                        className="rounded-full shadow-sm hover:bg-primary/5 hover:border-primary/50 transition-all"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <PasteSmsDialog onTransactionAdded={handleTransactionAdded} />
                    <AddCategoryDialog onCategoryAdded={handleCategoryAdded} />
                    <Link href="/dashboard/transactions">
                        <Button variant="outline" className="shadow-sm">
                            View All Transactions
                        </Button>
                    </Link>
                </div>
            </motion.div>

            <SmsRealtimeHint />

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

            <AnimatePresence>
                {pendingTransaction && (
                    <TransactionCategorizeNotification
                        open={!!pendingTransaction}
                        amount={pendingTransaction.amount || 0}
                        receiver={pendingTransaction.receiver || pendingTransaction.description || "Unknown"}
                        onCategorized={handleCategorized}
                        onDismiss={() => setPendingTransaction(null)}
                    />
                )}
            </AnimatePresence>

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
