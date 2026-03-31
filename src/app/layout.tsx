import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter-var",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Focalyst — Own your time",
  description:
    "Your all-in-one AI productivity hub. Plan tasks, focus deeply, capture ideas, and review your progress.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Focalyst",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#4A6C8C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${inter.variable} antialiased font-[family-name:var(--font-inter)]`}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
