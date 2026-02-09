import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuditContextProvider } from '@/context/AuditContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Lead-Time Guardian',
    description: 'AI-Powered Logistics Auto-Pilot',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AuditContextProvider>
                    {children}
                </AuditContextProvider>
            </body>
        </html>
    )
}
