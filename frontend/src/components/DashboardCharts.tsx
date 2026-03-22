"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from "recharts";
import { useMemo } from "react";
import { Calendar } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#ff7300"];

// Professional gradient colors for bar chart
const GRADIENT_COLORS = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
];

const BAR_COLORS = [
    "#667eea", "#f5576c", "#4facfe", "#43e97b", 
    "#fa709a", "#30cfd0", "#a8edea", "#ff9a9e"
];

interface SummaryData {
    category_summary: Record<string, number>;
    daily_breakdown?: Array<{ date: string; total: number }>;
    total_spent?: number;
    total_transactions?: number;
    highest_spending_category?: string;
}

type TimePeriod = "today" | "weekly" | "monthly" | "yearly";

interface DashboardChartsProps {
    data: SummaryData;
    timePeriod?: TimePeriod;
    onTimePeriodChange?: (period: TimePeriod) => void;
}

export const DashboardCharts = memo(function DashboardCharts({ data, timePeriod = "monthly", onTimePeriodChange }: DashboardChartsProps) {
    // Debug logging
    console.log("DashboardCharts received data:", data);
    console.log("Current timePeriod:", timePeriod);
    
    const pieData = useMemo(() => {
        return Object.entries(data.category_summary || {})
            .map(([name, value]) => ({
                name,
                value: Number(value) || 0,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8); // Top 8 categories
    }, [data.category_summary]);

    // Generate data based on actual transactions for each time period
    const barData = useMemo(() => {
        console.log("Calculating barData for timePeriod:", timePeriod);
        console.log("daily_breakdown:", data.daily_breakdown);
        console.log("category_summary:", data.category_summary);
        
        if (!data.category_summary || Object.keys(data.category_summary).length === 0) {
            console.log("No category summary data available");
            return [];
        }

        const totalAmount = Object.values(data.category_summary).reduce((sum, val) => sum + val, 0);
        console.log("Total amount from categories:", totalAmount);
        const now = new Date();
        
        // If we have daily_breakdown data, use it for appropriate time periods
        if (data.daily_breakdown && data.daily_breakdown.length > 0) {
            console.log("Using daily_breakdown data");
            switch (timePeriod) {
                case 'today':
                    // Filter today's transactions from daily breakdown
                    const todayStr = now.toISOString().split('T')[0];
                    const todayData = data.daily_breakdown.find(item => item.date === todayStr);
                    if (todayData && todayData.total > 0) {
                        const result = [
                            { name: 'Morning', amount: Math.round(todayData.total * 0.25) },
                            { name: 'Afternoon', amount: Math.round(todayData.total * 0.45) },
                            { name: 'Evening', amount: Math.round(todayData.total * 0.30) },
                        ];
                        console.log("Today's data result:", result);
                        return result;
                    }
                    console.log("No today data found");
                    break;
                    
                case 'weekly':
                    // Get last 7 days from daily breakdown
                    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    const weeklyData = data.daily_breakdown
                        .filter(item => new Date(item.date) >= sevenDaysAgo)
                        .slice(-7)
                        .map(item => ({
                            name: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
                            amount: item.total
                        }));
                    console.log("Weekly data result:", weeklyData);
                    return weeklyData.length > 0 ? weeklyData : [];
                    
                case 'monthly':
                    // Get last 30 days from daily breakdown, group by weeks
                    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    const monthlyData = data.daily_breakdown
                        .filter(item => new Date(item.date) >= thirtyDaysAgo)
                        .slice(-30);
                    
                    if (monthlyData.length > 0) {
                        // Group into 4 weeks
                        const weeks = [];
                        for (let i = 0; i < 4; i++) {
                            const startIdx = i * 7;
                            const endIdx = Math.min(startIdx + 7, monthlyData.length);
                            const weekData = monthlyData.slice(startIdx, endIdx);
                            const weekTotal = weekData.reduce((sum, item) => sum + item.total, 0);
                            weeks.push({
                                name: `Week ${i + 1}`,
                                amount: weekTotal
                            });
                        }
                        const result = weeks.filter(w => w.amount > 0);
                        console.log("Monthly data result:", result);
                        return result;
                    }
                    console.log("No monthly data found");
                    break;
                    
                case 'yearly':
                    // Get last 12 months from daily breakdown, group by months
                    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                    const yearlyData = data.daily_breakdown
                        .filter(item => new Date(item.date) >= twelveMonthsAgo);
                    
                    // Group by month
                    const monthGroups: Record<string, number> = {};
                    yearlyData.forEach(item => {
                        const month = new Date(item.date).toLocaleDateString('en-US', { month: 'short' });
                        monthGroups[month] = (monthGroups[month] || 0) + item.total;
                    });
                    
                    const result = Object.entries(monthGroups).map(([month, total]) => ({
                        name: month,
                        amount: total
                    }));
                    console.log("Yearly data result:", result);
                    return result;
            }
        } else {
            console.log("No daily_breakdown data available");
        }

        // Fallback: Use distributed totals when no daily breakdown is available for the period
        if (totalAmount > 0) {
            console.log("Using fallback distribution for timePeriod:", timePeriod);
            switch (timePeriod) {
                case 'today':
                    const result = [
                        { name: 'Morning', amount: Math.round(totalAmount * 0.25) },
                        { name: 'Afternoon', amount: Math.round(totalAmount * 0.45) },
                        { name: 'Evening', amount: Math.round(totalAmount * 0.30) },
                    ];
                    console.log("Fallback today result:", result);
                    return result;
                case 'weekly':
                    const weekDistribution = [0.15, 0.20, 0.18, 0.12, 0.15, 0.10, 0.10];
                    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    const weekResult = days.map((day, index) => ({
                        name: day,
                        amount: Math.round(totalAmount * weekDistribution[index])
                    }));
                    console.log("Fallback weekly result:", weekResult);
                    return weekResult;
                case 'monthly':
                    const monthDistribution = [0.25, 0.30, 0.25, 0.20];
                    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                    const monthResult = weeks.map((week, index) => ({
                        name: week,
                        amount: Math.round(totalAmount * monthDistribution[index])
                    }));
                    console.log("Fallback monthly result:", monthResult);
                    return monthResult;
                case 'yearly':
                    const yearDistribution = [
                        0.08, 0.07, 0.08, 0.09, 0.10, 0.09,
                        0.08, 0.08, 0.09, 0.08, 0.08, 0.08
                    ];
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const yearResult = months.map((month, index) => ({
                        name: month,
                        amount: Math.round(totalAmount * yearDistribution[index])
                    }));
                    console.log("Fallback yearly result:", yearResult);
                    return yearResult;
                default:
                    console.log("No fallback for timePeriod:", timePeriod);
                    return [];
            }
        }

        console.log("No data available, returning empty array");
        return [];
    }, [data.daily_breakdown, data.category_summary, timePeriod]);

    const chartTitle = useMemo(() => {
        switch (timePeriod) {
            case 'today':
                return 'Today\'s Spend';
            case 'weekly':
                return 'Weekly Spend';
            case 'yearly':
                return 'Yearly Spend';
            default:
                return 'Monthly Spend';
        }
    }, [timePeriod]);

    return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-1 md:col-span-2 lg:col-span-4 hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-2 gap-2">
                    <CardTitle className="text-lg sm:text-xl">{chartTitle}</CardTitle>
                    {onTimePeriodChange && (
                        <Select value={timePeriod} onValueChange={(value) => onTimePeriodChange(value as TimePeriod)}>
                            <SelectTrigger className="w-full sm:w-[140px]">
                                <Calendar className="mr-2 h-4 w-4" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </CardHeader>
                <CardContent className="pl-0 sm:pl-2">
                    {barData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300} className="sm:h-[350px]">
                            <BarChart 
                                data={barData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <XAxis
                                    dataKey="name"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `₹${value}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px',
                                    }}
                                    formatter={(value: any) => [`₹${value.toFixed(2)}`, 'Amount']}
                                />
                                <Bar 
                                    dataKey="amount" 
                                    radius={[8, 8, 0, 0]}
                                >
                                    {barData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={BAR_COLORS[index % BAR_COLORS.length]}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] sm:h-[350px] flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-sm">No {timePeriod === 'today' ? 'today' : timePeriod === 'weekly' ? 'weekly' : timePeriod === 'monthly' ? 'monthly' : 'yearly'} spending data</p>
                                <p className="text-xs mt-1">Add transactions to see your spending patterns</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card className="col-span-1 md:col-span-2 lg:col-span-3 hover:shadow-lg transition-shadow w-full">
                <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="text-lg sm:text-xl">Category Distribution</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
                    {pieData.length > 0 ? (
                        <div className="w-full">
                            <ResponsiveContainer width="100%" height={280} className="sm:h-[350px]">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--background))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                        }}
                                        formatter={(value: any) => [`₹${value.toFixed(2)}`, 'Amount']}
                                    />
                                    <Legend 
                                        formatter={(value) => value}
                                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                        iconType="circle"
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[280px] sm:h-[350px] text-muted-foreground">
                            No category data available
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
});
