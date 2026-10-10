import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TULSI",
  description: "Daily work reports, right on your dashboard.",
  // iPhones ignore most of the manifest; this is what makes "Add to Home
  // Screen" open full screen under the TULSI name there.
  appleWebApp: { capable: true, title: "TULSI", statusBarStyle: "default" },
};

// The phone's status bar while the installed app is open.
export const viewport: Viewport = {
  themeColor: "#2c3a75",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <ThemeProvider 
            attribute="class" 
            defaultTheme="system" 
            enableSystem 
            disableTransitionOnChange
            storageKey="theme"
          >
            <QueryProvider>
              {children}
              <Toaster />
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
