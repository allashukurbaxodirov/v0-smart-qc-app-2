import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { GCAProvider } from '@/lib/gca-context'
import { DRecordsProvider } from '@/lib/d-records-context'
import { ShiftProvider } from '@/lib/shift-context'
import { QRecordsProvider } from '@/lib/qrecords-context'
import { IncomingProvider } from '@/lib/incoming-context'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: 'Smart QC - UzAuto Motors',
  description: 'Industrial Quality Control Dashboard for UzAuto Motors Manufacturing',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png',  media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <GCAProvider>
          <DRecordsProvider>
            <ShiftProvider>
              <QRecordsProvider>
                <IncomingProvider>
                  {children}
                </IncomingProvider>
              </QRecordsProvider>
            </ShiftProvider>
          </DRecordsProvider>
        </GCAProvider>
      </body>
    </html>
  )
}
