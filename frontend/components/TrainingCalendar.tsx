"use client"
import React, { useState, useEffect } from 'react'
import { Button, Card, CardBody, CardHeader, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Input, Select, SelectItem, Chip, Spinner } from '@heroui/react'
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

interface Props {
  profileId: number
  programs: TrainingProgram[]
  currentProgram: TrainingProgram | null
  exercises: string[]
  onProgramChange: (program: TrainingProgram | null) => void
}

export default function TrainingCalendar({ profileId, programs, currentProgram, exercises, onProgramChange }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [sessions, setSessions] = useState<ProgramSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSession, setSelectedSession] = useState<ProgramSession | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()

  // Загрузка сессий для текущего месяца
  useEffect(() => {
    if (currentProgram) {
      loadSessions()
    }
  }, [currentProgram, currentDate])

  const loadSessions = async () => {
    if (!currentProgram) return

    setLoading(true)
    setError(null)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const response = await api.get(`/api/profiles/${profileId}/programs/${currentProgram.id}/sessions`, {
        params: { year, month }
      })
      setSessions(response.data)
    } catch (err: any) {
      console.error('Failed to load sessions:', err)
      setError(err?.response?.data?.error || 'Ошибка загрузки сессий')
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
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

  const getSessionForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return sessions.find(session => session.date === dateStr)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    const session = getSessionForDate(date)
    setSelectedSession(session || null)
    onOpen()
  }

  const handleCompleteSession = async (sessionId: number) => {
    try {
      await api.put(`/api/profiles/${profileId}/programs/${currentProgram?.id}/sessions/${sessionId}`, {
        completed: true
      })
      await loadSessions()
    } catch (err: any) {
      console.error('Failed to complete session:', err)
      setError(err?.response?.data?.error || 'Ошибка завершения тренировки')
    }
  }

  const handleCreateSession = async () => {
    if (!currentProgram || !selectedDate) return

    try {
      const response = await api.post(`/api/profiles/${profileId}/programs/${currentProgram.id}/sessions`, {
        date: selectedDate.toISOString().split('T')[0],
        exercises: []
      })
      setSessions(prev => [...prev, response.data])
    } catch (err: any) {
      console.error('Failed to create session:', err)
      setError(err?.response?.data?.error || 'Ошибка создания тренировки')
    }
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
                  <SelectItem key={program.id?.toString() || ''} value={program.id?.toString() || ''}>
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
              
              const session = getSessionForDate(day)
              const isToday = day.toDateString() === new Date().toDateString()
              const isPast = day < new Date().setHours(0, 0, 0, 0)
              
              return (
                <div
                  key={day.toISOString()}
                  className={`bg-white dark:bg-slate-900 h-24 p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    isToday ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleDateClick(day)}
                >
                  <div className="flex flex-col h-full">
                    <span className={`text-sm font-medium ${
                      isToday ? 'text-blue-600 dark:text-blue-400' : 
                      isPast ? 'text-slate-400 dark:text-slate-500' : 
                      'text-slate-900 dark:text-slate-100'
                    }`}>
                      {day.getDate()}
                    </span>
                    
                    {session && (
                      <div className="flex-1 flex items-center justify-center">
                        <div className={`w-2 h-2 rounded-full ${
                          session.completed ? 'bg-green-500' : 'bg-orange-500'
                        }`} />
                      </div>
                    )}
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

      {/* Session Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl">
        <ModalContent>
          <ModalHeader>
            {selectedDate && (
              <div>
                <h3 className="text-xl font-bold">
                  Тренировка на {selectedDate.toLocaleDateString('ru-RU', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                {currentProgram && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Программа: {currentProgram.name}
                  </p>
                )}
              </div>
            )}
          </ModalHeader>
          <ModalBody>
            {selectedSession ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Chip color={selectedSession.completed ? 'success' : 'warning'}>
                    {selectedSession.completed ? 'Выполнено' : 'Запланировано'}
                  </Chip>
                  {!selectedSession.completed && (
                    <Button
                      color="success"
                      size="sm"
                      onPress={() => handleCompleteSession(selectedSession.id!)}
                    >
                      Отметить как выполненное
                    </Button>
                  )}
                </div>
                
                {selectedSession.exercises.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Упражнения:</h4>
                    {selectedSession.exercises.map((exercise, index) => (
                      <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{exercise.exercise}</h5>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {exercise.sets} × {exercise.reps} × {exercise.weight}кг
                            </p>
                            {exercise.notes && (
                              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                                {exercise.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500 dark:text-slate-400">
                      Нет упражнений в этой тренировке
                    </p>
                  </div>
                )}
                
                {selectedSession.notes && (
                  <div>
                    <h4 className="font-semibold mb-2">Заметки:</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedSession.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  Тренировка не запланирована на этот день
                </p>
                <Button
                  color="primary"
                  onPress={handleCreateSession}
                >
                  Создать тренировку
                </Button>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Закрыть
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
