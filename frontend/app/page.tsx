"use client"
import React, { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import TrainingTable, { Training } from '../components/TrainingTable'
import { Exercise } from '../components/ExerciseSelector'
import ProfileSelector, { Profile } from '../components/ProfileSelector'
import ProfileSettings from '../components/ProfileSettings'
import { Button } from '@heroui/react'

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080' })

export default function HomePage() {
  const [rows, setRows] = useState<Training[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleWeeks, setVisibleWeeks] = useState<number>(1)
  const [isSaving, setIsSaving] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  async function fetchProfiles() {
    try {
      const res = await api.get<Profile[]>('/api/profiles')
      setProfiles(res.data)
      if (res.data.length > 0 && !currentProfile) {
        // Пытаемся загрузить последний выбранный профиль из localStorage
        const savedProfileId = localStorage.getItem('currentProfileId')
        const savedProfile = savedProfileId 
          ? res.data.find(p => p.id === parseInt(savedProfileId))
          : null
        
        const profileToSet = savedProfile || res.data[0]
        setCurrentProfile(profileToSet)
        
        // Сохраняем в localStorage, если не было сохранено
        if (!savedProfileId) {
          localStorage.setItem('currentProfileId', profileToSet.id.toString())
        }
      }
    } catch (e: any) {
      console.error('Failed to load profiles:', e)
    }
  }

  async function fetchRows(profileId?: number) {
    setLoading(true)
    setError(null)
    try {
      const params = profileId ? { profileId } : {}
      const res = await api.get<Training[]>('/api/trainings', { params })
      setRows(res.data)
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function fetchExercises() {
    try {
      const res = await api.get<Exercise[]>('/api/exercises')
      setExercises(res.data)
    } catch (e: any) {
      console.error('Failed to load exercises:', e)
    }
  }

  useEffect(() => {
    fetchProfiles()
    fetchExercises()
  }, [])

  useEffect(() => {
    if (currentProfile) {
      fetchRows(currentProfile.id)
    }
  }, [currentProfile])

  // Автосохранение с debounce
  const autoSave = useCallback((row: Training) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (row.id) {
        setIsSaving(true)
        try {
          const payload = { ...row, weeks: visibleWeeks }
          await api.put(`/api/trainings/${row.id}`, payload)
        } catch (e: any) {
          console.error('Auto-save failed:', e)
        } finally {
          setIsSaving(false)
        }
      }
    }, 2000) // Сохранение через 2 секунды после последнего изменения
  }, [visibleWeeks])

  function updateCell(index: number, key: keyof Training, value: string) {
    const next = [...rows]
    if (key === 'exercise') {
      next[index].exercise = value
    } else {
      // Разрешаем пустую строку для удобства ввода
      if (value === '') {
        next[index][key] = 0
      } else {
        const num = parseInt(value, 10)
        next[index][key] = Number.isNaN(num) ? 0 : num
      }
    }
    setRows(next)
    
    // Автосохранение
    autoSave(next[index])
  }

  async function saveRow(index: number) {
    const row = rows[index]
    const payload = { ...row, weeks: visibleWeeks }
    if (row.id) {
      await api.put(`/api/trainings/${row.id}`, payload)
    } else {
      const res = await api.post('/api/trainings', payload)
      const next = [...rows]
      next[index] = res.data
      setRows(next)
    }
  }

  async function deleteRow(index: number) {
    const row = rows[index]
    if (row.id) {
      await api.delete(`/api/trainings/${row.id}`)
    }
    setRows(rows.filter((_, i) => i !== index))
  }

  function addRow() {
    if (!currentProfile) return
    
    setRows([
      ...rows,
      {
        profileId: currentProfile.id,
        exercise: '',
        week1d1Reps: 0, week1d1Kg: 0, week1d2Reps: 0, week1d2Kg: 0, week1d3Reps: 0, week1d3Kg: 0, week1d4Reps: 0, week1d4Kg: 0, week1d5Reps: 0, week1d5Kg: 0, week1d6Reps: 0, week1d6Kg: 0,
        week2d1Reps: 0, week2d1Kg: 0, week2d2Reps: 0, week2d2Kg: 0, week2d3Reps: 0, week2d3Kg: 0, week2d4Reps: 0, week2d4Kg: 0, week2d5Reps: 0, week2d5Kg: 0, week2d6Reps: 0, week2d6Kg: 0,
        week3d1Reps: 0, week3d1Kg: 0, week3d2Reps: 0, week3d2Kg: 0, week3d3Reps: 0, week3d3Kg: 0, week3d4Reps: 0, week3d4Kg: 0, week3d5Reps: 0, week3d5Kg: 0, week3d6Reps: 0, week3d6Kg: 0,
        week4d1Reps: 0, week4d1Kg: 0, week4d2Reps: 0, week4d2Kg: 0, week4d3Reps: 0, week4d3Kg: 0, week4d4Reps: 0, week4d4Kg: 0, week4d5Reps: 0, week4d5Kg: 0, week4d6Reps: 0, week4d6Kg: 0,
      },
    ])
  }

  async function addCustomExercise(exercise: Omit<Exercise, 'id' | 'isCustom'>) {
    try {
      const res = await api.post<Exercise>('/api/exercises', exercise)
      setExercises([...exercises, res.data])
    } catch (e: any) {
      console.error('Failed to add custom exercise:', e)
      throw e
    }
  }

  async function createProfile(name: string) {
    try {
      const res = await api.post<Profile>('/api/profiles', { name })
      setProfiles([...profiles, res.data])
      setCurrentProfile(res.data)
      localStorage.setItem('currentProfileId', res.data.id.toString())
    } catch (e: any) {
      console.error('Failed to create profile:', e)
      throw e
    }
  }

  async function deleteProfile(id: number) {
    try {
      await api.delete(`/api/profiles/${id}`)
      const newProfiles = profiles.filter(p => p.id !== id)
      setProfiles(newProfiles)
      if (currentProfile?.id === id && newProfiles.length > 0) {
        setCurrentProfile(newProfiles[0])
        localStorage.setItem('currentProfileId', newProfiles[0].id.toString())
      }
    } catch (e: any) {
      console.error('Failed to delete profile:', e)
      throw e
    }
  }

  // Сохраняем выбранный профиль в localStorage при его смене
  const handleProfileChange = (profile: Profile) => {
    setCurrentProfile(profile)
    localStorage.setItem('currentProfileId', profile.id.toString())
  }

  async function updateProfile(profileData: Partial<Profile>) {
    if (!currentProfile) return
    
    try {
      const res = await api.put<Profile>(`/api/profiles/${currentProfile.id}`, {
        ...currentProfile,
        ...profileData
      })
      
      // Обновляем список профилей
      setProfiles(profiles.map(p => p.id === currentProfile.id ? res.data : p))
      setCurrentProfile(res.data)
    } catch (e: any) {
      console.error('Failed to update profile:', e)
      throw e
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn">
      <div className="glass shadow-2xl p-6 md:p-8 border border-white/30 dark:border-slate-700/30">
        <div className="flex flex-col gap-3 md:gap-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-xl shadow-sky-200/50 dark:shadow-sky-900/50 flex-shrink-0 animate-glow">
              <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 dark:from-sky-400 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent truncate">Планирование Тренировок</h1>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1 hidden sm:block font-medium">Фиксируйте подходы и веса по неделям с полным контролем</p>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex flex-col gap-3">
            {/* Top Row: Profile + Auto-save indicator */}
            <div className="flex items-center gap-2 flex-wrap">
              <ProfileSelector
                profiles={profiles}
                currentProfile={currentProfile}
                onSelectProfile={handleProfileChange}
                onCreateProfile={createProfile}
                onDeleteProfile={deleteProfile}
              />
              <Button
                size="sm"
                onPress={() => setIsSettingsOpen(true)}
                className="h-11 md:h-12 min-w-[48px] px-4 md:px-5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                title="Настройки профиля"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Button>
              {isSaving && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border border-emerald-200 dark:border-emerald-800 animate-fadeIn shadow-sm">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Сохранение...</span>
                </div>
              )}
            </div>

            {/* Bottom Row: Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Недель:</span>
                <Button 
                  variant="light" 
                  size="sm"
                  className="h-9 w-9 md:h-10 md:w-10 min-w-0 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200"
                  onPress={() => setVisibleWeeks(Math.max(1, visibleWeeks - 1))}
                  isDisabled={visibleWeeks <= 1}
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                  </svg>
                </Button>
                <span className="text-lg md:text-xl font-bold text-sky-600 dark:text-sky-400 min-w-[32px] text-center">{visibleWeeks}</span>
                <Button 
                  variant="light" 
                  size="sm"
                  className="h-9 w-9 md:h-10 md:w-10 min-w-0 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200"
                  onPress={() => setVisibleWeeks(Math.min(8, visibleWeeks + 1))}
                  isDisabled={visibleWeeks >= 8}
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </Button>
              </div>
              <Button
                size="sm"
                className="h-11 md:h-12 flex-1 sm:flex-none rounded-xl px-5 md:px-7 text-sm md:text-base font-bold bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xl shadow-sky-200/50 dark:shadow-sky-900/30 hover:shadow-2xl hover:shadow-sky-300/60 dark:hover:shadow-sky-800/60 hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
                onPress={addRow}
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Новая запись</span>
                <span className="sm:hidden">Добавить</span>
              </Button>
              <Button
                variant="bordered"
                className="h-11 md:h-12 rounded-xl px-5 md:px-6 text-sm md:text-base font-bold border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-sky-300 dark:hover:border-sky-600 hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
                onPress={() => currentProfile && fetchRows(currentProfile.id)}
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 mr-2 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Обновить</span>
                <svg className="w-5 h-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
        {(loading || error) && (
          <div className="mt-6 flex items-center gap-4">
            {loading && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950 dark:to-blue-950 border border-sky-200 dark:border-sky-800 shadow-sm animate-fadeIn">
                <svg className="w-5 h-5 text-sky-600 dark:text-sky-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-bold text-sky-700 dark:text-sky-300">Загрузка данных...</span>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 border border-red-200 dark:border-red-800 shadow-sm animate-fadeIn">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-bold text-red-700 dark:text-red-300">{error}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <TrainingTable
        data={rows}
        exercises={exercises}
        onChangeCell={updateCell}
        onSaveRow={saveRow}
        onDeleteRow={async (i) => deleteRow(i)}
        onAddRow={addRow}
        onAddCustomExercise={addCustomExercise}
        visibleWeeks={visibleWeeks}
      />

      {/* Profile Settings Modal */}
      <ProfileSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={currentProfile}
        onSave={updateProfile}
      />
    </div>
  )
}

