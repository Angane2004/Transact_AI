"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type DensityMode = "cozy" | "compact";

interface DensityContextType {
    density: DensityMode;
    setDensity: (mode: DensityMode) => void;
    getDensityClasses: () => {
        card: string;
        spacing: string;
        text: string;
        padding: string;
    };
}

const DensityContext = createContext<DensityContextType | undefined>(undefined);

const SETTINGS_STORAGE_KEY = "transactai_settings_experience";

export function DensityProvider({ children }: { children: ReactNode }) {
    const [density, setDensityState] = useState<DensityMode>("cozy");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            try {
                const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed.dashboardDensity) {
                        setDensityState(parsed.dashboardDensity);
                    }
                }
            } catch {
                // ignore corrupted settings
            }
        }
    }, []);

    const setDensity = (mode: DensityMode) => {
        setDensityState(mode);
        if (typeof window !== "undefined") {
            try {
                const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
                const existing = raw ? JSON.parse(raw) : {};
                localStorage.setItem(
                    SETTINGS_STORAGE_KEY,
                    JSON.stringify({ ...existing, dashboardDensity: mode })
                );
            } catch {
                // ignore errors
            }
        }
    };

    const getDensityClasses = () => {
        if (density === "compact") {
            return {
                card: "p-3 gap-2",
                spacing: "space-y-2",
                text: "text-sm",
                padding: "p-3",
            };
        }
        return {
            card: "p-6 gap-4",
            spacing: "space-y-4",
            text: "text-base",
            padding: "p-6",
        };
    };

    return (
        <DensityContext.Provider value={{ density, setDensity, getDensityClasses }}>
            {children}
        </DensityContext.Provider>
    );
}

export function useDensity() {
    const context = useContext(DensityContext);
    if (context === undefined) {
        throw new Error("useDensity must be used within a DensityProvider");
    }
    return context;
}
