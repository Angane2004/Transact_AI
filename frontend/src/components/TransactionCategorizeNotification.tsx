"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/lib/localStorageService";
import { firestoreService } from "@/lib/firestoreService";
import { motion, AnimatePresence } from "framer-motion";

interface TransactionCategorizeNotificationProps {
    open: boolean;
    amount: number;
    receiver: string;
    onCategorized: (category: string) => void;
    onDismiss: () => void;
    ai_explanation?: string;
    ai_suggestions?: string[];
}

export function TransactionCategorizeNotification({
    open,
    amount,
    receiver,
    onCategorized,
    onDismiss,
    ai_explanation,
    ai_suggestions,
}: TransactionCategorizeNotificationProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [newCategory, setNewCategory] = useState<string>("");
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        if (open) {
            const session = authService.getSession();
            const userId = session?.phone.replace(/\+/g, '').trim();
            if (userId) {
                firestoreService.getCategories(userId).then((res: any) => {
                    if (res.success) setCategories(res.data);
                });
            }
            setSelectedCategory("");
            setNewCategory("");
            setShowAddCategory(false);
        }
    }, [open]);

    const handleAddCategory = async () => {
        if (!newCategory.trim()) {
            toast.error("Please enter a category name");
            return;
        }

        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '').trim();
        const categoryName = newCategory.trim();
        
        if (!userId) return;

        if (categories.find(c => c.toLowerCase() === categoryName.toLowerCase())) {
            toast.error("Category already exists");
            return;
        }

        const res = await firestoreService.saveCategory(userId, categoryName);
        if (res.success) {
            setCategories([...categories, categoryName]);
            setSelectedCategory(categoryName);
            setNewCategory("");
            setShowAddCategory(false);
            toast.success(`Category "${categoryName}" added to cloud`);
        } else {
            toast.error("Failed to save category to cloud");
        }
    };

    const handleCategorize = () => {
        if (!selectedCategory) {
            toast.error("Please select or add a category");
            return;
        }
        onCategorized(selectedCategory);
        onDismiss();
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-4 z-50 w-[calc(100%-2rem)] max-w-md bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow-2xl border-2 border-yellow-200 dark:border-yellow-800 p-4 space-y-4"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                Categorize Transaction
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Paid ₹{amount.toFixed(2)} to {receiver}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={onDismiss}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {ai_explanation && (
                        <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm flex gap-2">
                            <Sparkles className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-blue-900 dark:text-blue-100">{ai_explanation}</p>
                        </div>
                    )}

                    {ai_suggestions && ai_suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {ai_suggestions.map(suggestion => (
                                <button
                                    key={suggestion}
                                    onClick={() => setSelectedCategory(suggestion)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                        selectedCategory === suggestion 
                                        ? "bg-blue-500 text-white border-blue-500" 
                                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="space-y-3">
                        {!showAddCategory ? (
                            <div className="flex gap-2">
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Choose a category" />
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
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setShowAddCategory(true)}
                                    className="shrink-0"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Input
                                    placeholder="New category name"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleAddCategory();
                                        } else if (e.key === "Escape") {
                                            setShowAddCategory(false);
                                            setNewCategory("");
                                        }
                                    }}
                                    className="flex-1"
                                    autoFocus
                                />
                                <Button
                                    variant="outline"
                                    onClick={handleAddCategory}
                                    className="shrink-0"
                                >
                                    Add
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setShowAddCategory(false);
                                        setNewCategory("");
                                    }}
                                    className="shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                onClick={handleCategorize}
                                className="flex-1"
                                disabled={!selectedCategory}
                            >
                                Categorize
                            </Button>
                            <Button
                                variant="outline"
                                onClick={onDismiss}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

