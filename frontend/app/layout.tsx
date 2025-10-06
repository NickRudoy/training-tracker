import './globals.css'
import React from 'react'
import { HeroUIProvider } from "@heroui/react"
import { Inter } from 'next/font/google'
import ThemeToggle from '../components/ThemeToggle'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata = {
  title: 'Трекер тренировок',
  description: 'Отслеживайте тренировки по неделям',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 antialiased dark:from-slate-900 dark:to-slate-950 dark:text-slate-100">
        {/* Apply saved theme before paint to avoid flash and hydration mismatch */}
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function(){
            try {
              // migrate old key 'theme' -> 'themeMode'
              var legacy = localStorage.getItem('theme');
              if (legacy && !localStorage.getItem('themeMode')) {
                localStorage.setItem('themeMode', legacy);
                localStorage.removeItem('theme');
              }
              var mode = localStorage.getItem('themeMode') || 'auto';
              var prefers= window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
              var dark = (mode === 'dark') || (mode === 'auto' && prefers);
              var root=document.documentElement;
              if (dark) { root.classList.add('dark'); root.setAttribute('data-theme','dark'); document.body && document.body.classList.add('dark'); }
              else { root.classList.remove('dark'); root.setAttribute('data-theme','light'); document.body && document.body.classList.remove('dark'); }
              // keep a data attribute with current mode for hydration-safe reads if needed
              root.setAttribute('data-theme-mode', mode);
            } catch(e){}
          })();
        `}</Script>
        <HeroUIProvider>
          <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-30 glass-strong">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm" />
                  <span className="text-sm font-semibold tracking-tight">Трекер тренировок</span>
                </div>
                {/* Mobile theme toggle */}
                <div className="md:hidden">
                  <ThemeToggle />
                </div>
                <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600 dark:text-slate-300">
                  <span className="hover:text-slate-900 transition-colors cursor-default">Главная</span>
                  <span className="hover:text-slate-900 transition-colors cursor-default">История</span>
                  <span className="hover:text-slate-900 transition-colors cursor-default">Настройки</span>
                  <ThemeToggle />
                </nav>
              </div>
            </header>
            <main className="flex-1">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                {children}
              </div>
            </main>
            <footer className="border-t border-slate-200/60 bg-white/50 dark:border-slate-700 dark:bg-slate-900/50">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between text-xs text-slate-500">
                <span className="dark:text-slate-400">© {new Date().getFullYear()} Трекер тренировок</span>
                <span className="hidden sm:inline dark:text-slate-400">Сделано на Next.js и Go</span>
              </div>
            </footer>
          </div>
        </HeroUIProvider>
      </body>
    </html>
  )
}


