import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "TeleMD — Cash-Pay Telehealth Platform",
    template: "%s | TeleMD",
  },
  description:
    "Secure, streamlined telehealth for independent practices in Pennsylvania. Book, pay, and attend visits entirely online.",
  keywords: ["telehealth", "telemedicine", "Pennsylvania", "online doctor", "cash pay"],
  openGraph: {
    title: "TeleMD — Cash-Pay Telehealth",
    description: "Telehealth for PA independent practices",
    type: "website",
    siteName: "TeleMD",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </body>
      </html>
    </ClerkProvider>
  );
}
