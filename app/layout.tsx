import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import { WatchTimerBar } from "@/components/WatchTimer";

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
    <html lang="en">
      <body className="min-h-screen pb-28">
        <QueryProvider>
          {children}
          <WatchTimerBar />
        </QueryProvider>
      </body>
    </html>
  );
}
