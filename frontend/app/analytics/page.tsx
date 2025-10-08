"use client"
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Button, Tabs, Tab } from '@heroui/react'
import Link from 'next/link'
import ProfileSelector, { Profile } from '../../components/ProfileSelector'
import ProgressCharts from '../../components/ProgressCharts'
import BodyWeightTracker from '../../components/BodyWeightTracker'
import PersonalRecords from '../../components/PersonalRecords'
import GoalTracker from '../../components/GoalTracker'
import TrainingHistory from '../../components/TrainingHistory'

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080' })

type ProfileStats = {
  totalWorkouts: number
  totalExercises: number
  totalVolume: number
  averageIntensity: number
  bmi?: number
}

type ProgressStats = {
  weightProgress: number
  volumeProgress: number
  frequencyPerWeek: number
  mostImprovedExercise: string
}

type MuscleGroupStat = {
  muscleGroup: string
  count: number
  volume: number
  percentage: number
}

type ExerciseStat = {
  exercise: string
  maxWeight: number
  totalVolume: number
  progress: number
}

type Analytics = {
  profile: ProfileStats
  progress: ProgressStats
  muscleGroupBalance: MuscleGroupStat[]
  recommendations: string[]
  exerciseStats: ExerciseStat[]
}

type Training = {
  id?: number
  profileId: number
  exercise: string
  week1d1Reps: number; week1d1Kg: number; week1d2Reps: number; week1d2Kg: number; week1d3Reps: number; week1d3Kg: number; week1d4Reps: number; week1d4Kg: number; week1d5Reps: number; week1d5Kg: number; week1d6Reps: number; week1d6Kg: number;
  week2d1Reps: number; week2d1Kg: number; week2d2Reps: number; week2d2Kg: number; week2d3Reps: number; week2d3Kg: number; week2d4Reps: number; week2d4Kg: number; week2d5Reps: number; week2d5Kg: number; week2d6Reps: number; week2d6Kg: number;
  week3d1Reps: number; week3d1Kg: number; week3d2Reps: number; week3d2Kg: number; week3d3Reps: number; week3d3Kg: number; week3d4Reps: number; week3d4Kg: number; week3d5Reps: number; week3d5Kg: number; week3d6Reps: number; week3d6Kg: number;
  week4d1Reps: number; week4d1Kg: number; week4d2Reps: number; week4d2Kg: number; week4d3Reps: number; week4d3Kg: number; week4d4Reps: number; week4d4Kg: number; week4d5Reps: number; week4d5Kg: number; week4d6Reps: number; week4d6Kg: number;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [trainings, setTrainings] = useState<Training[]>([])
  const [selectedExercises, setSelectedExercises] = useState<string[]>([])
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('all')
  const [activeTab, setActiveTab] = useState('overview')
  const [exercises, setExercises] = useState<string[]>([])

  // Загрузка профилей
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const res = await api.get<Profile[]>('/api/profiles')
        setProfiles(res.data)
        if (res.data.length > 0) {
          // Пытаемся загрузить последний выбранный профиль из localStorage
          const savedProfileId = localStorage.getItem('currentProfileId')
          const savedProfile = savedProfileId 
            ? res.data.find(p => p.id === parseInt(savedProfileId))
            : null
          
          setCurrentProfile(savedProfile || res.data[0])
        }
      } catch (error) {
        console.error('Failed to load profiles:', error)
      }
    }

    loadProfiles()
  }, [])

  // Загрузка аналитики и тренировок при смене профиля
  useEffect(() => {
    const loadData = async () => {
      if (!currentProfile) return
      
      setLoading(true)
      try {
        const [analyticsRes, trainingsRes, exercisesRes] = await Promise.all([
          api.get(`/api/profiles/${currentProfile.id}/analytics`),
          api.get(`/api/trainings?profileId=${currentProfile.id}`),
          api.get(`/api/profiles/${currentProfile.id}/exercises`)
        ])
        
        setAnalytics(analyticsRes.data)
        setTrainings(trainingsRes.data)
        setExercises(exercisesRes.data.exercises)
        
        // Автоматически выбираем первые 3 упражнения для графиков
        const exercises = trainingsRes.data
          .map((t: Training) => t.exercise)
          .filter((ex: string) => ex)
          .slice(0, 3)
        setSelectedExercises(exercises)
      } catch (error) {
        console.error('Failed to load data:', error)
        setAnalytics(null)
        setTrainings([])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentProfile])

  const handleProfileChange = (profile: Profile) => {
    setCurrentProfile(profile)
    // Сохраняем выбор в localStorage
    localStorage.setItem('currentProfileId', profile.id.toString())
  }

  const createProfile = async (name: string) => {
    try {
      const res = await api.post<Profile>('/api/profiles', { name })
      setProfiles([...profiles, res.data])
      setCurrentProfile(res.data)
      localStorage.setItem('currentProfileId', res.data.id.toString())
    } catch (error) {
      console.error('Failed to create profile:', error)
      throw error
    }
  }

  const deleteProfile = async (id: number) => {
    try {
      await api.delete(`/api/profiles/${id}`)
      const newProfiles = profiles.filter(p => p.id !== id)
      setProfiles(newProfiles)
      if (currentProfile?.id === id && newProfiles.length > 0) {
        setCurrentProfile(newProfiles[0])
        localStorage.setItem('currentProfileId', newProfiles[0].id.toString())
      }
    } catch (error) {
      console.error('Failed to delete profile:', error)
      throw error
    }
  }

  // Функции для работы с графиками
  const handleExerciseToggle = (exercise: string) => {
    setSelectedExercises(prev => 
      prev.includes(exercise) 
        ? prev.filter(ex => ex !== exercise)
        : [...prev, exercise]
    )
  }

  const handlePeriodChange = (newPeriod: 'week' | 'month' | 'year' | 'all') => {
    setPeriod(newPeriod)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Анализируем данные...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900 dark:to-orange-900 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Недостаточно данных</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Добавьте тренировки и заполните параметры профиля для получения аналитики
          </p>
          <Link href="/">
            <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold">
              Вернуться к тренировкам
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="light" className="mb-6 h-11 px-5 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Назад к тренировкам
            </Button>
          </Link>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-xl shadow-sky-200/50 dark:shadow-sky-900/50 flex-shrink-0 animate-glow">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 dark:from-sky-400 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  Аналитика и рекомендации
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 mt-2 font-medium">Анализ ваших тренировок и персональные советы</p>
              </div>
            </div>
            
            {/* Profile Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Профиль:</span>
              <ProfileSelector
                profiles={profiles}
                currentProfile={currentProfile}
                onSelectProfile={handleProfileChange}
                onCreateProfile={createProfile}
                onDeleteProfile={deleteProfile}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          className="w-full"
          classNames={{
            tabList: "bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/30 dark:border-slate-700/30 rounded-2xl p-2 shadow-lg",
            tab: "data-[selected=true]:bg-gradient-to-r data-[selected=true]:from-indigo-500 data-[selected=true]:to-violet-600 data-[selected=true]:text-white rounded-xl font-bold transition-all duration-300",
            cursor: "hidden"
          }}
        >
          <Tab key="overview" title="Обзор">
            <div className="mt-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Total Workouts */}
          <div className="glass shadow-2xl p-6 border border-white/30 dark:border-slate-700/30 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-bold text-slate-700 dark:text-slate-300">Всего тренировок</span>
              <svg className="w-10 h-10 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{analytics.profile.totalWorkouts}</p>
          </div>

          {/* Total Exercises */}
          <div className="glass shadow-2xl p-6 border border-white/30 dark:border-slate-700/30 animate-fadeIn" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-bold text-slate-700 dark:text-slate-300">Упражнений</span>
              <svg className="w-10 h-10 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{analytics.profile.totalExercises}</p>
          </div>

          {/* Total Volume */}
          <div className="glass shadow-2xl p-6 border border-white/30 dark:border-slate-700/30 animate-fadeIn" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-bold text-slate-700 dark:text-slate-300">Общий объем</span>
              <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              {(analytics.profile.totalVolume / 1000).toFixed(1)}
              <span className="text-xl ml-1 text-slate-600 dark:text-slate-400">т</span>
            </p>
          </div>

          {/* BMI */}
          {analytics.profile.bmi && (
            <div className="glass shadow-2xl p-6 border border-white/30 dark:border-slate-700/30 animate-fadeIn" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-base font-bold text-slate-700 dark:text-slate-300">BMI</span>
                <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{analytics.profile.bmi.toFixed(1)}</p>
            </div>
          )}
        </div>

        {/* Progress & Muscle Balance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Progress */}
          <div className="glass shadow-2xl p-8 border border-white/30 dark:border-slate-700/30 animate-fadeIn">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-3">
              <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Прогресс
            </h3>
            <div className="space-y-4">
              {analytics.progress.weightProgress > 0 && (
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Рост весов</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      +{analytics.progress.weightProgress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                      style={{ width: `${Math.min(analytics.progress.weightProgress, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Частота</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {analytics.progress.frequencyPerWeek.toFixed(1)} тренировок/неделю
                </span>
              </div>
              
              {analytics.progress.mostImprovedExercise && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950">
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    🏆 Лучший прогресс: {analytics.progress.mostImprovedExercise}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Muscle Balance */}
          <div className="glass shadow-2xl p-8 border border-white/30 dark:border-slate-700/30 animate-fadeIn" style={{ animationDelay: '200ms' }}>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-3">
              <svg className="w-7 h-7 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Баланс мышечных групп
            </h3>
            <div className="space-y-3">
              {analytics.muscleGroupBalance.slice(0, 5).map((mg, idx) => (
                <div key={idx}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{mg.muscleGroup}</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {mg.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                      style={{ width: `${mg.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="glass shadow-2xl p-8 border border-white/30 dark:border-slate-700/30 mb-10 animate-fadeIn">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-3">
            <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Рекомендации
          </h3>
          <div className="space-y-3">
            {analytics.recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border border-amber-200 dark:border-amber-800">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Exercises */}
        <div className="glass shadow-2xl p-8 border border-white/30 dark:border-slate-700/30 animate-fadeIn">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-3">
            <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Топ упражнений по объему
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700 dark:text-slate-300">#</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Упражнение</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Макс. вес</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Объем</th>
                </tr>
              </thead>
              <tbody>
                {analytics.exerciseStats.slice(0, 10).map((ex, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="py-3 px-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">{idx + 1}</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">{ex.exercise}</td>
                    <td className="py-3 px-4 text-sm font-bold text-right text-slate-700 dark:text-slate-300">{ex.maxWeight} кг</td>
                    <td className="py-3 px-4 text-sm font-bold text-right text-emerald-600 dark:text-emerald-400">
                      {(ex.totalVolume / 1000).toFixed(1)} т
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
            </div>
          </Tab>

          <Tab key="charts" title="Графики">
            <div className="mt-8">
              <ProgressCharts
                profileId={currentProfile?.id || 0}
                selectedExercises={selectedExercises}
                onExerciseToggle={handleExerciseToggle}
                period={period}
                onPeriodChange={handlePeriodChange}
              />
            </div>
          </Tab>

          <Tab key="body-weight" title="Вес тела">
            <div className="mt-8">
              <BodyWeightTracker profileId={currentProfile?.id || 0} />
            </div>
          </Tab>

          <Tab key="personal-records" title="Рекорды">
            <div className="mt-8">
              <PersonalRecords 
                profileId={currentProfile?.id || 0} 
                exercises={exercises}
              />
            </div>
          </Tab>

          <Tab key="goals" title="Цели">
            <div className="mt-8">
              <GoalTracker
                profileId={currentProfile?.id || 0}
                exercises={exercises}
              />
            </div>
          </Tab>

          <Tab key="training-history" title="История">
            <div className="mt-8">
              <TrainingHistory profileId={currentProfile?.id || 0} />
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  )
}

