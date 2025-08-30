import type React from "react"
import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import { Open_Sans } from "next/font/google"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { ErrorProvider } from "@/components/providers/ErrorProvider"
import QueryProvider from "@/components/providers/QueryProvider"
import GlobalHeader from "@/components/layout/GlobalHeader"
import GlobalWeatherAlerts from "@/components/weather/GlobalWeatherAlerts"
import "./globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
  weight: ["400", "600", "700", "900"],
})

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "Premium Deep Sea Fishing in Cascais | €400 Atlantic Adventure",
  description:
    "Experience the thrill of deep sea fishing in Cascais, Portugal. Professional guide, premium equipment, 4-hour Atlantic adventure. Book your €400 fishing trip today.",
  generator: "v0.app",
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${openSans.variable} antialiased`}>
      <body>
        <ErrorProvider>
          <SessionProvider>
            <QueryProvider>
              <GlobalHeader />
              <GlobalWeatherAlerts />
              <main className="min-h-screen">
                {children}
              </main>
            </QueryProvider>
          </SessionProvider>
        </ErrorProvider>
      </body>
    </html>
  )
}
