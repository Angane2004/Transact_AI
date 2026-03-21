"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function GlobalBackground() {
    const pathname = usePathname();

    // Don't show GlobalBackground anymore - BackgroundPattern handles all pages
    return null;
}
