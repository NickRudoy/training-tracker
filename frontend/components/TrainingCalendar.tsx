"use client"
import React, { useState, useEffect } from 'react'
import { Button, Card, CardBody, CardHeader, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Input, Select, SelectItem, Chip, Spinner } from '@heroui/react'
import UiModal from './UiModal'
import TrainingSession from './TrainingSession'
import axios from 'axios'

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
  dayOfWeek: number
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

type PlanDay = {
  date: string
  exercises: ProgramExercise[]
}

interface Props {
  profileId: number
  programs: TrainingProgram[]
  currentProgram: TrainingProgram | null
  exercises: string[]
  onProgramChange: (program: TrainingProgram | null) => void
}

export default function TrainingCalendar({ profileId, programs, currentProgram, exercises, onProgramChange }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [programExercises, setProgramExercises] = useState<ProgramExercise[]>([])
  const [sessions, setSessions] = useState<ProgramSession[]>([])
  const [planDays, setPlanDays] = useState<PlanDay[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()

  const toLocalYMD = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // Загрузка сессий для текущего месяца
  useEffect(() => {
    if (currentProgram) {
      loadProgramExercises()
      loadPlanDays()
      loadSessions()
    }
  }, [currentProgram, currentDate])

  const loadSessions = async () => {
    if (!currentProgram) return

    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const response = await api.get(`/api/profiles/${profileId}/programs/${currentProgram.id}/sessions`, {
        params: { year, month }
      })
      setSessions(response.data || [])
    } catch (err: any) {
      console.error('Failed to load sessions:', err)
    }
  }

  const loadProgramExercises = async () => {
    if (!currentProgram) return

    try {
      const response = await api.get(`/api/profiles/${profileId}/programs/${currentProgram.id}/exercises`)
      setProgramExercises(response.data)
    } catch (err: any) {
      console.error('Failed to load program exercises:', err)
    }
  }

  const loadPlanDays = async () => {
    if (!currentProgram) return
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const response = await api.get(`/api/profiles/${profileId}/programs/${currentProgram.id}/plan-days`, {
        params: { year, month }
      })
      setPlanDays(response.data || [])
    } catch (err: any) {
      console.error('Failed to load plan days:', err)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    // JS getDay(): 0=Sun..6=Sat. We need Monday-first index 0..6
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7
    
    const days = []
    
    // Добавляем пустые ячейки для начала месяца
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Добавляем дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getSessionsForDate = (date: Date) => {
    const dateStr = toLocalYMD(date)
    return sessions.filter(session => {
      const sessionDateStr = toLocalYMD(new Date(session.date))
      return sessionDateStr === dateStr
    })
  }

  const getLatestSessionForDate = (date: Date) => {
    const daySessions = getSessionsForDate(date)
    if (daySessions.length === 0) return undefined
    return daySessions.sort((a, b) => {
      const au = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const bu = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      if (bu !== au) return bu - au
      const aid = a.id || 0
      const bid = b.id || 0
      return bid - aid
    })[0]
  }

  const hasPlanForDate = (date: Date) => {
    const ymd = toLocalYMD(date)
    return planDays.some(d => d.date === ymd)
  }

  const getPlannedExercisesForDate = (date: Date) => {
    // getDay(): 0 (Sun) .. 6 (Sat); our dayOfWeek: 1 (Mon) .. 7 (Sun)
    const weekday = ((date.getDay() + 6) % 7) + 1
    if (!currentProgram) return [] as ProgramExercise[]
    // Ограничиваем план периодом программы
    const start = currentProgram.startDate ? new Date(currentProgram.startDate) : null
    const end = currentProgram.endDate ? new Date(currentProgram.endDate) : null
    const dateOnly = new Date(date)
    dateOnly.setHours(0,0,0,0)
    if (start) start.setHours(0,0,0,0)
    if (end) end.setHours(0,0,0,0)
    const outside = (start && dateOnly < start) || (end && dateOnly > end)
    if (outside) return [] as ProgramExercise[]

    return programExercises
      .filter(ex => ex.dayOfWeek === weekday)
      .sort((a, b) => a.order - b.order)
  }

  const isOutsideProgramPeriod = (date: Date) => {
    // Если программа не выбрана — считаем, что за пределами периода (ничего не показываем)
    if (!currentProgram) return true
    const start = currentProgram.startDate ? new Date(currentProgram.startDate) : null
    const end = currentProgram.endDate ? new Date(currentProgram.endDate) : null
    const day = new Date(date)
    day.setHours(0,0,0,0)
    if (start) start.setHours(0,0,0,0)
    if (end) end.setHours(0,0,0,0)
    return (start && day < start) || (end && day > end)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    onOpen()
  }


  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const getDayNames = () => ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('ru-RU', { 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const days = getDaysInMonth(currentDate)
  const dayNames = getDayNames()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatMonthYear(currentDate)}
          </h2>
          {currentProgram && (
            <Chip color="primary" variant="flat">
              {currentProgram.name}
            </Chip>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="light"
            size="sm"
            onPress={() => navigateMonth('prev')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <Button
            variant="light"
            size="sm"
            onPress={() => setCurrentDate(new Date())}
          >
            Сегодня
          </Button>
          <Button
            variant="light"
            size="sm"
            onPress={() => navigateMonth('next')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Program Selector */}
      {programs.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Программа:</span>
              <Select
                placeholder="Выберите программу"
                selectedKeys={currentProgram ? [currentProgram.id?.toString() || ''] : []}
                onSelectionChange={(keys) => {
                  const selectedId = Array.from(keys)[0] as string
                  const program = programs.find(p => p.id?.toString() === selectedId)
                  onProgramChange(program || null)
                }}
                className="max-w-xs"
              >
                {programs.map((program) => (
                  <SelectItem key={program.id?.toString() || ''}>
                    {program.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Program Period Info */}
      {currentProgram && (currentProgram.startDate || currentProgram.endDate) && (
        <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
          <CardBody className="py-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Период программы:</span>
              <span>
                {currentProgram.startDate && currentProgram.endDate ? (
                  <>
                    {new Date(currentProgram.startDate).toLocaleDateString('ru-RU')} — {new Date(currentProgram.endDate).toLocaleDateString('ru-RU')}
                  </>
                ) : currentProgram.startDate ? (
                  <>с {new Date(currentProgram.startDate).toLocaleDateString('ru-RU')}</>
                ) : currentProgram.endDate ? (
                  <>до {new Date(currentProgram.endDate).toLocaleDateString('ru-RU')}</>
                ) : null}
              </span>
              <span className="text-slate-500 dark:text-slate-500">•</span>
              <span>Дни вне периода недоступны для планирования</span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Calendar */}
      <Card>
        <CardBody className="p-0">
          <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700">
            {/* Day headers */}
            {dayNames.map((day) => (
              <div key={day} className="bg-slate-100 dark:bg-slate-800 p-3 text-center">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  {day}
                </span>
              </div>
            ))}
            
            {/* Calendar days */}
            {days.map((day, index) => {
              if (!day) {
                return <div key={index} className="bg-white dark:bg-slate-900 h-24" />
              }
              
              const latestSession = getLatestSessionForDate(day)
              const isToday = day.toDateString() === new Date().toDateString()
              const isPast = day.getTime() < new Date(new Date().setHours(0, 0, 0, 0)).getTime()
              const outside = isOutsideProgramPeriod(day)
              const planned = hasPlanForDate(day)
              
              return (
                <div
                  key={day.toISOString()}
                  className={`relative bg-white dark:bg-slate-900 h-24 p-2 ${outside ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'} transition-colors ${
                    isToday ? 'ring-1 ring-slate-300 dark:ring-slate-600' : ''
                  }`}
                  onClick={() => {
                    if (!outside) handleDateClick(day)
                  }}
                >
                  <div className="flex flex-col h-full">
                    {/* Plan bar (top): green if backend shows completed session for this day, else orange */}
                    {!outside && planned && (
                      <div className="mb-1">
                        <div className={`h-1 w-full rounded-full ${latestSession?.completed ? 'bg-green-500' : 'bg-orange-300'}`} />
                      </div>
                    )}
                    <span className={`text-sm font-medium ${
                      isToday ? 'text-blue-600 dark:text-blue-400' : 
                      outside ? 'text-slate-300 dark:text-slate-600' : 
                      isPast ? 'text-slate-400 dark:text-slate-500' : 
                      'text-slate-900 dark:text-slate-100'
                    }`}>
                      {day.getDate()}
                    </span>
                    
                    {/* Bottom fact bar removed per request */}
                  </div>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-slate-600 dark:text-slate-400">Выполнено</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-slate-600 dark:text-slate-400">Запланировано</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-slate-600 dark:text-slate-400">Сегодня</span>
        </div>
      </div>

      {/* Training Session Modal */}
      <TrainingSession
        profileId={profileId}
        currentProgram={currentProgram}
        selectedDate={selectedDate}
        isOpen={isOpen}
        onClose={onClose}
        onSessionUpdate={loadSessions}
      />
    </div>
  )
}
