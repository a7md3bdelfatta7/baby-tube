import type { Metadata } from "next";
import "./globals.css";
import { AppBackdrop } from "@/components/AppBackdrop";
import { QueryProvider } from "@/components/QueryProvider";
import { WatchTimerBar } from "@/components/WatchTimer";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Baby Tube 🎈",
  description: "A safe, bubbly little video player for our baby girl",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="relative min-h-screen pb-28">
        <AppBackdrop />
        <QueryProvider>
          {children}
          <WatchTimerBar />
        </QueryProvider>
      </body>
    </html>
  );
}
