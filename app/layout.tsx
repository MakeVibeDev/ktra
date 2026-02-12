import type { Metadata } from 'next'
import Image from 'next/image'
import './globals.css'

export const metadata: Metadata = {
  title: 'KTRA 참가자 정보 입력',
  description: '성남 마라톤 복수 결제 참가자 정보 입력',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <header className="bg-header text-white py-3">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="KTRA"
                width={48}
                height={48}
              />
              <span className="font-medium">(사)대한트레일러닝협회</span>
            </div>
          </div>
        </header>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
        <footer className="bg-header text-white py-6 text-center text-sm">
          <p>© 2026 KTRA (사)대한트레일러닝협회. All rights reserved.</p>
        </footer>
      </body>
    </html>
  )
}
