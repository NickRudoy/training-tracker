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
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 text-slate-900 antialiased dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-slate-100">
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
              if (dark) { root.classList.add('dark'); root.setAttribute('data-theme','dark'); }
              else { root.classList.remove('dark'); root.setAttribute('data-theme','light'); }
              // keep a data attribute with current mode for hydration-safe reads if needed
              root.setAttribute('data-theme-mode', mode);
            } catch(e){}
          })();
        `}</Script>
        <HeroUIProvider>
          <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-30 glass-strong border-b border-white/20 dark:border-slate-700/30">
              <div className="mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-200/50 dark:shadow-sky-900/50 animate-glow" />
                  <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">Трекер тренировок</span>
                </div>
                {/* Mobile theme toggle */}
                <div className="md:hidden">
                  <ThemeToggle />
                </div>
                <nav className="hidden md:flex items-center gap-8 text-sm">
                  <a href="/" className="relative group hover:text-sky-600 dark:hover:text-sky-400 transition-all duration-300 cursor-pointer font-semibold px-3 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20">
                    Главная
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-sky-500 to-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </a>
                  <a href="/program" className="relative group hover:text-sky-600 dark:hover:text-sky-400 transition-all duration-300 cursor-pointer font-semibold px-3 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20">
                    Программа
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-sky-500 to-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </a>
                  <a href="/analytics" className="relative group hover:text-sky-600 dark:hover:text-sky-400 transition-all duration-300 cursor-pointer font-semibold px-3 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20">
                    Аналитика
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-sky-500 to-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </a>
                  <ThemeToggle />
                </nav>
              </div>
            </header>
            <main className="flex-1">
              <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
              </div>
            </main>
            <footer className="border-t border-white/20 dark:border-slate-700/30 glass-strong">
              <div className="mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400 font-medium">© {new Date().getFullYear()} Трекер тренировок</span>
                <span className="hidden sm:inline text-slate-500 dark:text-slate-500 font-medium">Сделано на Next.js и Go</span>
              </div>
            </footer>
          </div>
        </HeroUIProvider>
      </body>
    </html>
  )
}


