import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Aurora } from "@/components/layout/aurora";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

const DESCRIPTION = "Test management for teams that ship: cases, runs, results, bugs and reports.";

function siteUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "TestVault", template: "%s · TestVault" },
  description: DESCRIPTION,
  // Fixed here, so a link shared on social media reads the same whichever page it lands on.
  openGraph: { title: "TestVault: test management, beautifully fast", description: DESCRIPTION, type: "website", siteName: "TestVault" },
  twitter: { card: "summary_large_image", title: "TestVault: test management, beautifully fast", description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0b1e" },
    { media: "(prefers-color-scheme: light)", color: "#f4f5fd" },
  ],
};

// Runs before first paint so a saved light theme never flashes dark.
const themeScript = `try{if(localStorage.getItem("tv-theme")==="light"){var r=document.documentElement;r.classList.remove("dark");r.style.colorScheme="light"}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrains.variable}`}
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Aurora />
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
