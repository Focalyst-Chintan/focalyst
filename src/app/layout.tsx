import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import AuthInitializer from "@/components/AuthInitializer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter-var",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://focalyst.online'),
  title: {
    default: 'Focalyst · Own your time',
    template: '%s | Focalyst',
  },
  description:
    'A calm, all-in-one productivity hub. Plan your days, focus deeply, capture ideas and see how you grow.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Focalyst · Own your time',
    description:
      'A calm, all-in-one productivity hub. Plan your days, focus deeply, capture ideas and see how you grow.',
    url: 'https://focalyst.online',
    siteName: 'Focalyst',
    images: [{ url: '/landing/hero.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Focalyst · Own your time',
    description:
      'A calm, all-in-one productivity hub. Plan your days, focus deeply, capture ideas and see how you grow.',
    images: ['/landing/hero.png'],
  },
  icons: {
    icon: '/small-logo.png',
    apple: '/small-logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Focalyst',
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
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`scroll-smooth ${instrument.variable}`}>
      <body className={`${inter.variable} antialiased font-[family-name:var(--font-inter)] bg-[#F4F7FA] text-[#2C4259] dark:bg-slate-950 dark:text-slate-100 lg:bg-transparent transition-colors duration-300`}>
        <ThemeProvider>
          <AuthProvider>
            <AuthInitializer>
              {children}
            </AuthInitializer>
            <ServiceWorkerRegister />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


