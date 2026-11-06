"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Recharts is large, so it loads after the page. The placeholders match each chart's height, so nothing shifts.
const tall = () => <Skeleton className="h-64 rounded-xl" />;
const short = () => <Skeleton className="h-56 rounded-xl" />;

export const Donut = dynamic(() => import("./charts-impl").then((mod) => mod.DonutImpl), { ssr: false, loading: short });
export const StackedArea = dynamic(() => import("./charts-impl").then((mod) => mod.StackedAreaImpl), { ssr: false, loading: short });
export const TrendLine = dynamic(() => import("./charts-impl").then((mod) => mod.TrendLineImpl), { ssr: false, loading: tall });
export const Bars = dynamic(() => import("./charts-impl").then((mod) => mod.BarsImpl), { ssr: false, loading: tall });
