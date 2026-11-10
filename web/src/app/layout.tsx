import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sparecycles.sahuja.in"),
  title: {
    default: "SpareCycles: your campus's idle compute, put to work",
    template: "%s · SpareCycles",
  },
  description:
    "SpareCycles is peer-to-peer campus compute. Students contribute idle CPU and GPU time; anyone can submit Blender renders, ML training, data processing and simulation jobs that are split into chunks and run across the network.",
  applicationName: "SpareCycles",
  openGraph: {
    title: "SpareCycles",
    description: "Your campus's idle compute, put to work.",
    url: "https://sparecycles.sahuja.in",
    siteName: "SpareCycles",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F5F9" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0C10" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <body className="antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
