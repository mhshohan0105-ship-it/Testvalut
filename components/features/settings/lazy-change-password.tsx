"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const LazyChangePassword = dynamic(() => import("./change-password-form").then((mod) => mod.ChangePasswordForm), {
  ssr: false,
  loading: () => <Skeleton className="mt-3 h-16 rounded-xl" />,
});
