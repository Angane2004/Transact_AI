"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { transactionService, categoryService, authService, downloadService, DownloadRecord, cacheService } from "@/lib/localStorageService";
import { api, endpoints } from "@/lib/api";
import { Download, FileText, FileSpreadsheet, FileJson, Filter, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type TimePeriod = "today" | "weekly" | "monthly" | "yearly";
type ExportFormat = "csv" | "json" | "xlsx";

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("today");
    const [searchQuery, setSearchQuery] = useState("");
    const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        filterTransactions();
    }, [transactions, selectedCategory, selectedPeriod, searchQuery]);

    const loadData = async () => {
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '');

        try {
            setLoading(true);
            const [transRes, summaryRes] = await Promise.all([
                api.get(endpoints.getTransactions, { params: { limit: 100 } }),
                api.get(endpoints.getSummary)
            ]);
            
            const newTransactions = transRes.data.results;
            const newSummary = summaryRes.data;

            setTransactions(newTransactions);
            setCategories(Object.keys(newSummary.category_summary || {}));

            // Update Cache
            if (userId) {
                transactionService.saveMany(newTransactions, userId);
                cacheService.saveSummary(newSummary, userId);
            }
        } catch (error) {
            console.error("Failed to load transactions:", error);
            
            // Fallback to Cache
            const cachedTransactions = transactionService.getAll(userId);
            const cachedSummary = cacheService.getSummary(userId);

            if (cachedTransactions.length > 0) {
                setTransactions(cachedTransactions);
                if (cachedSummary) {
                    setCategories(Object.keys(cachedSummary.category_summary || {}));
                }
                toast.info("Showing cached transactions (offline)");
            } else {
                toast.error("Failed to sync with cloud. No local data found.");
            }
        } finally {
            setLoading(false);
        }
    };

    const filterTransactions = () => {
        let filtered = [...transactions];

        // Filter by category
        if (selectedCategory !== "all") {
            filtered = filtered.filter(t => t.category === selectedCategory || t.predicted_category === selectedCategory);
        }

        // Filter by time period
        const now = new Date();
        const periodStart = new Date();
        
        switch (selectedPeriod) {
            case "today":
                periodStart.setHours(0, 0, 0, 0);
                break;
            case "weekly":
                periodStart.setDate(now.getDate() - 7);
                break;
            case "monthly":
                periodStart.setMonth(now.getMonth() - 1);
                break;
            case "yearly":
                periodStart.setFullYear(now.getFullYear() - 1);
                break;
        }

        filtered = filtered.filter(t => {
            const txDate = new Date(t.txn_time || t.date);
            return txDate >= periodStart && txDate <= now;
        });

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                (t.description || t.raw_text || "").toLowerCase().includes(query) ||
                (t.category || t.predicted_category || "").toLowerCase().includes(query) ||
                (t.receiver_name || t.recipient || "").toLowerCase().includes(query)
            );
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.txn_time || b.date).getTime() - new Date(a.txn_time || a.date).getTime());

        setFilteredTransactions(filtered);
    };

    const handleCategoryChange = async (transactionId: string, newCategory: string) => {
        try {
            await api.patch(`/transactions/${transactionId}`, { category: newCategory });
            toast.success("Category updated in cloud");
            loadData();
        } catch (error) {
            console.error("Failed to update category:", error);
            toast.error("Failed to update category on server");
        }
    };

    const exportData = () => {
        const data = filteredTransactions.map(t => ({
            Date: new Date(t.date).toLocaleDateString(),
            Description: t.description,
            Amount: `₹${t.amount.toFixed(2)}`,
            Category: t.category,
            Recipient: t.recipient || "N/A",
            Type: t.type || "debit",
        }));

        let content = "";
        let mimeType = "";
        let filename = "";

        switch (exportFormat) {
            case "csv":
                const headers = Object.keys(data[0] || {}).join(",");
                const rows = data.map(row => Object.values(row).join(","));
                content = [headers, ...rows].join("\n");
                mimeType = "text/csv";
                filename = `transactions_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`;
                break;
            case "json":
                content = JSON.stringify(data, null, 2);
                mimeType = "application/json";
                filename = `transactions_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.json`;
                break;
            case "xlsx":
                // For XLSX, we'll create a CSV that Excel can open
                const xlsxHeaders = Object.keys(data[0] || {}).join("\t");
                const xlsxRows = data.map(row => Object.values(row).join("\t"));
                content = [xlsxHeaders, ...xlsxRows].join("\n");
                mimeType = "application/vnd.ms-excel";
                filename = `transactions_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.xls`;
                break;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Save download record
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '');
        const downloadRecord: DownloadRecord = {
            id: `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            filename,
            format: exportFormat,
            fileSize: blob.size,
            fileContent: content,
            mimeType,
            downloadDate: new Date().toISOString(),
            transactionCount: filteredTransactions.length,
            period: selectedPeriod,
        };
        downloadService.save(downloadRecord, userId);

        toast.success(`Data exported as ${exportFormat.toUpperCase()}`);
    };

    const getTotalAmount = useMemo(() => {
        return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    }, [filteredTransactions]);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Transactions
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Manage and categorize your transactions
                    </p>
                </div>
            </motion.div>

            {/* Filters and Export */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters & Export
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search transactions..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Category</label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Time Period</label>
                                <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as TimePeriod)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="weekly">Last 7 Days</SelectItem>
                                        <SelectItem value="monthly">Last Month</SelectItem>
                                        <SelectItem value="yearly">Last Year</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Export Format</label>
                                <div className="flex gap-2">
                                    <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="csv">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4" />
                                                    CSV
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="json">
                                                <div className="flex items-center gap-2">
                                                    <FileJson className="h-4 w-4" />
                                                    JSON
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="xlsx">
                                                <div className="flex items-center gap-2">
                                                    <FileSpreadsheet className="h-4 w-4" />
                                                    Excel
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={exportData} className="px-4">
                                        <Download className="h-4 w-4 mr-2" />
                                        Export
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Total Transactions:</span>
                                <span className="text-lg font-bold">{filteredTransactions.length}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-sm font-medium">Total Amount:</span>
                                <span className="text-lg font-bold">₹{getTotalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Transactions Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle>Transaction List</CardTitle>
                        <CardDescription>
                            Click on category dropdown to change transaction category
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                                        <th className="text-left py-3 px-4 font-semibold text-sm">Description</th>
                                        <th className="text-left py-3 px-4 font-semibold text-sm">Amount</th>
                                        <th className="text-left py-3 px-4 font-semibold text-sm">Category</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No transactions found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTransactions.map((transaction, index) => (
                                            <motion.tr
                                                key={transaction.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.02 }}
                                                className="border-b hover:bg-muted/50 transition-colors"
                                            >
                                                <td className="py-3 px-4">
                                                    {(() => {
                                                        try {
                                                            const date = new Date(transaction.txn_time || transaction.date);
                                                            if (isNaN(date.getTime())) return "Unknown Date";
                                                            return date.toLocaleDateString('en-IN', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            });
                                                        } catch (e) {
                                                            return "Unknown Date";
                                                        }
                                                    })()}
                                                </td>
                                                <td className="py-3 px-4 font-medium">
                                                    <div className="flex flex-col">
                                                        <span>{transaction.description}</span>
                                                        {transaction.is_anomaly && (
                                                            <div className="flex items-center text-xs text-red-500 mt-1">
                                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                                {transaction.anomaly_reason || "Unusual transaction"}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`font-semibold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Select
                                                        value={transaction.category}
                                                        onValueChange={(value) => handleCategoryChange(transaction.id, value)}
                                                    >
                                                        <SelectTrigger className="w-[180px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {categories.map(cat => (
                                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

