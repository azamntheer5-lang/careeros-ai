import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProvider } from "@/components/app-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareerOS AI — The AI Career Operating System",
  description: "Create, optimize and grow your entire professional career with AI. Resume engine, ATS intelligence, interview simulator, career coach and more.",
  keywords: ["AI career", "resume builder", "ATS", "interview simulator", "career coach", "job tracker"],
  authors: [{ name: "CareerOS AI" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "CareerOS AI",
    description: "The AI Career Operating System",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AppProvider>
            {children}
            <Toaster />
            <SonnerToaster richColors position="top-center" />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
