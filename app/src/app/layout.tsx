import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Geist, Geist_Mono } from "next/font/google"
import { ReactQueryProvider } from "@/providers/react-query-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { AccentSync } from "@/components/accent-sync"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Lunch To Go",
  description: "Alternate Lunch Money accounts dashboard with desktop support.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={[
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "connect-src 'self' https://api.lunchmoney.app",
            "img-src 'self' data:",
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self' https://fonts.gstatic.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join("; ")}
        />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AccentSync />
          <ReactQueryProvider>
            {children}
            <Toaster richColors position="top-center" closeButton />
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
