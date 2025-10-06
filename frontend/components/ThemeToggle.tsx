"use client"
import React, { useEffect, useMemo, useState } from 'react'

type ThemeMode = 'auto' | 'light' | 'dark'

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('auto')
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(false)

  function applyTheme(nextMode: ThemeMode, prefersDark: boolean) {
    const root = document.documentElement
    const dark = nextMode === 'dark' || (nextMode === 'auto' && prefersDark)
    root.classList.toggle('dark', dark)
    root.setAttribute('data-theme', dark ? 'dark' : 'light')
    root.setAttribute('data-theme-mode', nextMode)
    document.body.classList.toggle('dark', dark)
  }

  // Инициализация из раннего скрипта/хранилища и подписка на системную тему
  useEffect(() => {
    const mm = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
    const prefers = !!mm && mm.matches
    setSystemPrefersDark(prefers)

    // Считываем режим: сначала из data-атрибута, затем из localStorage
    const root = document.documentElement
    const attrMode = (root.getAttribute('data-theme-mode') as ThemeMode | null)
    let initialMode: ThemeMode = attrMode || (localStorage.getItem('themeMode') as ThemeMode) || 'auto'
    // миграция со старого ключа
    const legacy = localStorage.getItem('theme')
    if (!attrMode && !localStorage.getItem('themeMode') && legacy) {
      if (legacy === 'light' || legacy === 'dark') initialMode = legacy as ThemeMode
      localStorage.setItem('themeMode', initialMode)
      localStorage.removeItem('theme')
    }
    setMode(initialMode)
    applyTheme(initialMode, prefers)

    const onChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches)
      if (initialMode === 'auto') {
        applyTheme('auto', e.matches)
      }
    }
    if (mm && typeof mm.addEventListener === 'function') mm.addEventListener('change', onChange)
    else if (mm && typeof (mm as any).addListener === 'function') (mm as any).addListener(onChange)

    return () => {
      if (mm && typeof mm.removeEventListener === 'function') mm.removeEventListener('change', onChange)
      else if (mm && typeof (mm as any).removeListener === 'function') (mm as any).removeListener(onChange)
    }
  }, [])

  function updateMode(nextMode: ThemeMode) {
    try { localStorage.setItem('themeMode', nextMode) } catch (_) {}
    setMode(nextMode)
    applyTheme(nextMode, systemPrefersDark)
  }

  const label = useMemo(() => {
    if (mode === 'auto') return 'Авто'
    return mode === 'dark' ? 'Тёмная' : 'Светлая'
  }, [mode])

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="theme-mode" className="sr-only">Тема</label>
      <select
        id="theme-mode"
        value={mode}
        onChange={(e) => updateMode(e.target.value as ThemeMode)}
        className="h-8 rounded-md border border-slate-300/70 bg-white px-2 text-xs text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        aria-label="Режим темы"
      >
        <option value="auto">Авто</option>
        <option value="light">Светлая</option>
        <option value="dark">Тёмная</option>
      </select>
      <span className="hidden md:inline text-[11px] text-slate-600 dark:text-slate-300">{label}</span>
    </div>
  )
}


