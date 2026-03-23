"use client";

import { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Transaction } from "@/lib/localStorageService";
import { motion } from "framer-motion";
import { IndianRupee, Tag, Edit3, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { firestoreService } from "@/lib/firestoreService";
import { authService } from "@/lib/localStorageService";
import { CategorizeTransactionDialog } from "./CategorizeTransactionDialog";
import { api } from "@/lib/api";

interface TransactionListProps {
    transactions: any[];
    categories?: string[];
    onTransactionCategorized?: () => void;
}

export const TransactionList = memo(function TransactionList({ transactions, categories = [], onTransactionCategorized }: TransactionListProps) {
    const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    
    // For the enhanced dialog
    const [showCategorizeDialog, setShowCategorizeDialog] = useState(false);
    const [selectedTxnForCategorize, setSelectedTxnForCategorize] = useState<string | null>(null);
    const [receiverForCategorize, setReceiverForCategorize] = useState("");
    const [amountForCategorize, setAmountForCategorize] = useState(0);

    const handleCategorize = async (transactionId: string, category: string) => {
        if (!category) {
            toast.error("Please select a category");
            return;
        }

        try {
            const session = authService.getSession();
            const userId = (session?.phone || 'default').replace(/\+/g, '').trim();
            
            if (!userId) {
                toast.error("User not identified");
                return;
            }

            const res = await firestoreService.updateTransaction(userId, transactionId, {
                category: category,
                status: 'completed'
            });

            // CRITICAL: Update local storage too so it reflects immediately
            const { transactionService } = await import("@/lib/localStorageService");
            transactionService.update(transactionId, { category, status: 'completed' }, userId);

            if (res.success) {
                // Also update backend if it exists there
                try {
                    await api.patch(`/transactions/${transactionId}`, { 
                        category: category,
                        status: 'completed'
                    });
                } catch (e) {
                    console.log("Optional backend sync failed - probably firestore-only txn");
                }

                toast.success(`Transaction categorized as ${category}`);
                setEditingTransaction(null);
                setSelectedCategory("");
                onTransactionCategorized?.();
            } else {
                toast.error("Failed to categorize transaction");
            }
        } catch (error) {
            console.error("Categorization error:", error);
            toast.error("Failed to categorize transaction");
        }
    };

    if (transactions.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                        No transactions found.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {transactions.map((txn, index) => (
                            <motion.div
                                key={txn.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-0"
                            >
                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm md:text-base">
                                            {txn.description || txn.receiver_name || txn.recipient || "Unnamed Transaction"}
                                        </span>
                                        {txn.category && (
                                            <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                                                {txn.category}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground mt-1">
                                        {(() => {
                                            try {
                                                const date = new Date(txn.txn_time || txn.date);
                                                if (isNaN(date.getTime())) return "Unknown Date";
                                                return format(date, "MMM d, yyyy h:mm a");
                                            } catch (e) {
                                                return "Unknown Date";
                                            }
                                        })()}
                                    </span>
                                    {(txn.status === 'pending' || txn.category === 'Others') && (
                                        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-orange-500 uppercase tracking-wider">
                                            <Sparkles className="h-3 w-3" />
                                            Needs Category
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2 ml-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold text-sm md:text-base ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                            {txn.type === 'credit' ? '+' : '-'}₹{Number(txn.amount)?.toFixed(2) || "0.00"}
                                        </span>
                                        {(txn.category === 'Others' || txn.status === 'pending') && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedTxnForCategorize(txn.id);
                                                    setReceiverForCategorize(txn.description || txn.receiver_name || "Unknown");
                                                    setAmountForCategorize(Number(txn.amount) || 0);
                                                    setShowCategorizeDialog(true);
                                                }}
                                                className="h-6 px-2 text-[10px] border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100"
                                            >
                                                <Edit3 className="h-2 w-2 mr-1" />
                                                Categorize
                                            </Button>
                                        )}
                                        {!txn.category && txn.category !== 'Others' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setEditingTransaction(txn.id)}
                                                className="h-6 px-2 text-xs"
                                            >
                                                <Edit3 className="h-3 w-3 mr-1" />
                                                Categorize
                                            </Button>
                                        )}
                                    </div>
                                    
                                    {editingTransaction === txn.id ? (
                                        <div className="flex items-center gap-2">
                                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                                <SelectTrigger className="w-32 h-8 text-xs">
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.map((cat) => (
                                                        <SelectItem key={cat} value={cat}>
                                                            {cat}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                size="sm"
                                                onClick={() => handleCategorize(txn.id, selectedCategory)}
                                                className="h-8 px-2 text-xs"
                                            >
                                                <Tag className="h-3 w-3 mr-1" />
                                                Save
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setEditingTransaction(null);
                                                    setSelectedCategory("");
                                                }}
                                                className="h-8 px-2 text-xs"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    ) : (
                                        txn.category ? (
                                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                                                {txn.category}
                                            </span>
                                        ) : (
                                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                Uncategorized
                                            </span>
                                        )
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </CardContent>

            <CategorizeTransactionDialog
                open={showCategorizeDialog}
                onOpenChange={setShowCategorizeDialog}
                amount={amountForCategorize}
                receiver={receiverForCategorize}
                onCategorized={(category) => {
                    if (selectedTxnForCategorize) {
                        handleCategorize(selectedTxnForCategorize, category);
                    }
                }}
            />
        </Card>
    );
});
