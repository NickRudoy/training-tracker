"use client"
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Button, Card, CardBody, CardHeader, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Input, Select, SelectItem, Chip, Spinner, Tabs, Tab } from '@heroui/react'
import Link from 'next/link'
import ProfileSelector, { Profile } from '../../components/ProfileSelector'
import TrainingCalendar from '../../components/TrainingCalendar'
import ProgramPlanner from '../../components/ProgramPlanner'

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080' })

type TrainingProgram = {
  id?: number
  profileId: number
  name: string
  description: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type ProgramExercise = {
  id?: number
  programId: number
  exercise: string
  dayOfWeek: number // 1-7 (понедельник-воскресенье)
  order: number
  sets: number
  reps: number
  weight: number
  notes: string
  createdAt: string
  updatedAt: string
}

type ProgramSession = {
  id?: number
  programId: number
  date: string
  exercises: ProgramExercise[]
  completed: boolean
  notes: string
  createdAt: string
  updatedAt: string
}

export default function ProgramPage() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([])
  const [currentProgram, setCurrentProgram] = useState<TrainingProgram | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('calendar')
  const [exercises, setExercises] = useState<string[]>([])

  // Загрузка профилей
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const res = await api.get<Profile[]>('/api/profiles')
        setProfiles(res.data)
        if (res.data.length > 0) {
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

  // Загрузка программ и упражнений при смене профиля
  useEffect(() => {
    const loadData = async () => {
      if (!currentProfile) return
      
      setLoading(true)
      try {
        const [programsRes, exercisesRes] = await Promise.all([
          api.get(`/api/profiles/${currentProfile.id}/programs`),
          api.get(`/api/profiles/${currentProfile.id}/exercises`)
        ])
        
        setPrograms(programsRes.data)
        setExercises(exercisesRes.data.exercises)
        
        // Выбираем активную программу или первую доступную
        const activeProgram = programsRes.data.find((p: TrainingProgram) => p.isActive)
        setCurrentProgram(activeProgram || programsRes.data[0] || null)
      } catch (error) {
        console.error('Failed to load data:', error)
        setPrograms([])
        setExercises([])
        setCurrentProgram(null)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentProfile])

  const handleProfileChange = (profile: Profile) => {
    setCurrentProfile(profile)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Загружаем программу тренировок...</p>
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
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-200/50 dark:shadow-emerald-900/50 flex-shrink-0 animate-glow">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  Программа тренировок
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 mt-2 font-medium">Планируйте и отслеживайте свои тренировки</p>
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
            tab: "data-[selected=true]:bg-gradient-to-r data-[selected=true]:from-emerald-500 data-[selected=true]:to-teal-600 data-[selected=true]:text-white rounded-xl font-bold transition-all duration-300",
            cursor: "hidden"
          }}
        >
          <Tab key="calendar" title="Календарь">
            <div className="mt-8">
              <TrainingCalendar
                profileId={currentProfile?.id || 0}
                programs={programs}
                currentProgram={currentProgram}
                exercises={exercises}
                onProgramChange={setCurrentProgram}
              />
            </div>
          </Tab>

          <Tab key="planner" title="Планировщик">
            <div className="mt-8">
              <ProgramPlanner
                profileId={currentProfile?.id || 0}
                programs={programs}
                currentProgram={currentProgram}
                exercises={exercises}
                onProgramChange={setCurrentProgram}
                onProgramsUpdate={setPrograms}
              />
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  )
}
