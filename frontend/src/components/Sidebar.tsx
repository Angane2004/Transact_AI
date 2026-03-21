"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    PieChart,
    Settings,
    LogOut,
    Menu,
    Receipt,
    Download,
    Sparkles,
    Sun,
    Moon,
    Bot,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { authService } from "@/lib/localStorageService";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

const routes = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
        color: "text-sky-500",
    },
    {
        label: "Transactions",
        icon: Receipt,
        href: "/dashboard/transactions",
        color: "text-green-500",
    },
    {
        label: "Analytics",
        icon: PieChart,
        href: "/dashboard/analytics",
        color: "text-violet-500",
    },
    {
        label: "Settings",
        icon: Settings,
        href: "/dashboard/settings",
        color: "text-pink-700",
    },
    {
        label: "Insights",
        icon: Sparkles,
        href: "/dashboard/insights",
        color: "text-amber-500",
    },
    {
        label: "Ask AI",
        icon: Bot,
        href: "/dashboard/chat",
        color: "text-blue-400",
    },
    {
        label: "Downloads",
        icon: Download,
        href: "/dashboard/downloads",
        color: "text-blue-600",
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Fix hydration error by only rendering Sheet on client
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogout = async () => {
        const session = authService.getSession();
        if (session) {
            // Clear user-specific unlock flag
            const phone = session.phone.replace(/\+/g, "");
            const unlockKey = `app_unlocked_${phone}`;
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem(unlockKey);
            }
        }
        await authService.clearSession();
        router.push("/login");
    };

    return (
        <>
            {/* Mobile Sidebar */}
            {mounted ? (
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden fixed top-4 right-4 z-50 bg-background/95 backdrop-blur-sm border shadow-lg hover:bg-background dark:bg-gray-900 dark:border-gray-700"
                            aria-label="Open menu"
                        >
                            <Menu className="h-6 w-6 text-foreground" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent
                        side="right"
                        className="p-0 w-72 bg-gray-900 text-black data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    >
                        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                        <SidebarContent pathname={pathname} onLogout={handleLogout} setIsOpen={setIsOpen} />
                    </SheetContent>
                </Sheet>
            ) : (
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden fixed top-4 right-4 z-50 bg-background/95 backdrop-blur-sm border shadow-lg hover:bg-background dark:bg-gray-900 dark:border-gray-700"
                    aria-label="Open menu"
                    suppressHydrationWarning
                >
                    <Menu className="h-6 w-6 text-foreground" />
                </Button>
            )}

            {/* Desktop Sidebar */}
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900 text-white">
                <SidebarContent pathname={pathname} onLogout={handleLogout} />
            </div>
        </>
    );
}

function SidebarContent({ pathname, onLogout, setIsOpen }: { pathname: string; onLogout: () => void; setIsOpen?: (open: boolean) => void }) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-[#ffffff] dark:bg-slate-950 text-black dark:text-white transition-colors">
            <div className="px-3 py-2 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-14">
                    <div className="relative w-8 h-8 mr-4">
                        {/* Logo placeholder */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-pink-500 to-violet-500 rounded-lg" />
                    </div>
                    <h1 className="text-2xl font-bold">TransactAI</h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            onClick={() => setIsOpen?.(false)}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 dark:hover:bg-white/10 rounded-lg transition",
                                pathname === route.href ? "text-black/40 dark:text-white/90 bg-white dark:bg-white/10" : "text-zinc-400"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <div className="px-3 py-2 space-y-2 border-t border-zinc-200 dark:border-zinc-800">
                {/* Theme Toggle */}
                {mounted && (
                    <Button
                        onClick={toggleTheme}
                        variant="ghost"
                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-white/10 dark:hover:bg-white/10"
                    >
                        {theme === "dark" ? (
                            <>
                                <Sun className="h-5 w-5 mr-3 text-yellow-500" />
                                Light Mode
                            </>
                        ) : (
                            <>
                                <Moon className="h-5 w-5 mr-3 text-blue-500" />
                                Dark Mode
                            </>
                        )}
                    </Button>
                )}
                <Button
                    onClick={onLogout}
                    variant="ghost"
                    className="w-full justify-start text-zinc-400 hover:text-white hover:bg-white/10 dark:hover:bg-white/10"
                >
                    <LogOut className="h-5 w-5 mr-3 text-red-500" />
                    Logout
                </Button>
            </div>
        </div>
    );
}
