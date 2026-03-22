"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Sparkles, IndianRupee, TrendingUp } from "lucide-react";

interface CategoriesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: string[];
    categorySummary?: Record<string, number>;
}

export function CategoriesDialog({ open, onOpenChange, categories, categorySummary = {} }: CategoriesDialogProps) {
    // Debug logging
    console.log("=== CategoriesDialog Debug ===");
    console.log("Dialog open:", open);
    console.log("Categories received:", categories);
    console.log("Categories type:", typeof categories);
    console.log("Categories length:", categories?.length);
    console.log("Categories array:", Array.isArray(categories));
    console.log("Category summary:", categorySummary);
    console.log("=== End Debug ===");
    
    // Auto-refresh when dialog opens
    useEffect(() => {
        if (open) {
            console.log("CategoriesDialog opened - categories:", categories);
            console.log("CategoriesDialog opened - length:", categories?.length);
        }
    }, [open, categories]);
    
    // Calculate total spending for percentage calculation
    const totalSpending = Object.values(categorySummary).reduce((sum, amount) => sum + amount, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        All Categories
                    </DialogTitle>
                    <DialogDescription>
                        View all transaction categories and their spending details
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {/* Always show a test message to verify rendering */}
                    <div className="text-xs text-gray-500 mb-4">
                        DEBUG: Categories count = {categories?.length || 0}
                    </div>
                    
                    {categories && categories.length > 0 ? (
                        <div className="space-y-3">
                            {categories
                                .sort((a, b) => (categorySummary[b] || 0) - (categorySummary[a] || 0)) // Sort by amount (highest first)
                                .map((cat, index) => {
                                    const amount = categorySummary[cat] || 0;
                                    const percentage = totalSpending > 0 ? (amount / totalSpending * 100).toFixed(1) : '0.0';
                                    const hasSpending = amount > 0;
                                    
                                    return (
                                        <motion.div
                                            key={cat}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow ${
                                                hasSpending ? 'bg-card' : 'bg-gray-50 dark:bg-gray-800/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full ${
                                                    hasSpending ? 'bg-primary/60' : 'bg-gray-400'
                                                }`}></div>
                                                <div>
                                                    <h4 className="font-medium text-sm">{cat}</h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {hasSpending ? `${percentage}% of total spending` : 'No spending yet'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1 font-semibold">
                                                    <IndianRupee className="h-4 w-4" />
                                                    {amount.toFixed(2)}
                                                </div>
                                                {hasSpending ? (
                                                    <div className="flex items-center gap-1 text-xs text-green-600">
                                                        <TrendingUp className="h-3 w-3" />
                                                        Active
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                                                        Unused
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No categories found. Add categories to organize your transactions.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

