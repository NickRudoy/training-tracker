"use client"
import React, { useState, useEffect } from 'react'
import { Button, Card, CardBody, CardHeader, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Input, Select, SelectItem, Chip, Spinner, Textarea, Checkbox } from '@heroui/react'
import UiModal from './UiModal'
import axios from 'axios'

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080' })

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

interface Props {
  profileId: number
  currentProgram: TrainingProgram | null
  selectedDate: Date | null
  isOpen: boolean
  onClose: () => void
  onSessionUpdate: () => void
}

export default function TrainingSession({ profileId, currentProgram, selectedDate, isOpen, onClose, onSessionUpdate }: Props) {
  const [session, setSession] = useState<ProgramSession | null>(null)
  const [plannedExercises, setPlannedExercises] = useState<ProgramExercise[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [sessionNotes, setSessionNotes] = useState('')

  const toLocalYMD = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  useEffect(() => {
    if (isOpen && selectedDate && currentProgram) {
      loadSessionData()
    }
  }, [isOpen, selectedDate, currentProgram])

  const loadSessionData = async () => {
    if (!currentProgram || !selectedDate) return

    setLoading(true)
    setError(null)
    try {
      // Загружаем упражнения программы для этого дня недели
      const weekday = ((selectedDate.getDay() + 6) % 7) + 1 // 1-7 (понедельник-воскресенье)
      const exercisesResponse = await api.get(`/api/profiles/${profileId}/programs/${currentProgram.id}/exercises`)
      const allExercises = exercisesResponse.data
      const dayExercises = allExercises
        .filter((ex: ProgramExercise) => ex.dayOfWeek === weekday)
        .sort((a: ProgramExercise, b: ProgramExercise) => a.order - b.order)
      setPlannedExercises(dayExercises)

      // Проверяем, есть ли уже сессия на этот день
      const dateStr = toLocalYMD(selectedDate)
      const year = selectedDate.getFullYear()
      const month = selectedDate.getMonth() + 1
      
      try {
        const sessionsResponse = await api.get(`/api/profiles/${profileId}/programs/${currentProgram.id}/sessions`, {
          params: { year, month }
        })
        const sessionsForDay: ProgramSession[] = (sessionsResponse.data || []).filter((s: ProgramSession) => {
          const sDateStr = new Date(s.date).toISOString().split('T')[0]
          return sDateStr === dateStr
        })
        // Берём самую свежую по updatedAt, если нет — по id
        const existingSession = sessionsForDay.sort((a, b) => {
          const au = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
          const bu = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
          if (bu !== au) return bu - au
          return (b.id || 0) - (a.id || 0)
        })[0]
        setSession(existingSession || null)
        setSessionNotes(existingSession?.notes || '')
      } catch (err) {
        // Если сессии нет, это нормально
        setSession(null)
        setSessionNotes('')
      }
    } catch (err: any) {
      console.error('Failed to load session data:', err)
      setError(err?.response?.data?.error || 'Ошибка загрузки данных тренировки')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = async () => {
    if (!currentProgram || !selectedDate) return

    try {
      const dateStr = toLocalYMD(selectedDate)
      const response = await api.post(`/api/profiles/${profileId}/programs/${currentProgram.id}/sessions`, {
        date: dateStr,
        notes: sessionNotes
      })
      setSession(response.data)
      onSessionUpdate()
    } catch (err: any) {
      console.error('Failed to create session:', err)
      setError(err?.response?.data?.error || 'Ошибка создания тренировки')
    }
  }

  const handleUpdateSession = async () => {
    if (!session || !currentProgram) return

    try {
      await api.put(`/api/profiles/${profileId}/programs/${currentProgram.id}/sessions/${session.id}`, {
        completed: session.completed,
        notes: sessionNotes
      })
      setSession(prev => prev ? { ...prev, notes: sessionNotes } : null)
      onSessionUpdate()
    } catch (err: any) {
      console.error('Failed to update session:', err)
      setError(err?.response?.data?.error || 'Ошибка обновления тренировки')
    }
  }

  const handleToggleCompleted = async (checked: boolean) => {
    if (!currentProgram || !selectedDate) return

    

    try {
      if (session) {
        
        const response = await api.put(`/api/profiles/${profileId}/programs/${currentProgram.id}/sessions/${session.id}`, {
          completed: checked,
          notes: sessionNotes
        })
        
        setSession(response.data) // Используем данные с сервера
      } else if (checked) {
        
        const dateStr = toLocalYMD(selectedDate)
        const response = await api.post(`/api/profiles/${profileId}/programs/${currentProgram.id}/sessions`, {
          date: dateStr,
          notes: sessionNotes,
          completed: checked
        })
        
        setSession(response.data)
      } else {
        // Нет сессии и чекбокс снимают — ничего не создаём
        setSession(null)
      }
      onSessionUpdate()
    } catch (err: any) {
      console.error('Failed to toggle completion:', err)
      setError(err?.response?.data?.error || 'Ошибка изменения статуса выполнения')
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDayName = (dayOfWeek: number) => {
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
    return days[dayOfWeek - 1] || 'Неизвестный день'
  }

  if (loading) {
    return (
      <UiModal isOpen={isOpen} onClose={onClose} size="4xl">
        <ModalContent>
          <ModalBody className="flex justify-center items-center py-12">
            <Spinner size="lg" />
          </ModalBody>
        </ModalContent>
      </UiModal>
    )
  }

  return (
    <UiModal isOpen={isOpen} onClose={onClose} size="4xl">
      <ModalContent>
        <ModalHeader className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Тренировка на {selectedDate && formatDate(selectedDate)}
            </h3>
            {currentProgram && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                Программа: {currentProgram.name}
              </p>
            )}
            {plannedExercises.length > 0 && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                День: {getDayName(((selectedDate?.getDay() || 0) + 6) % 7 + 1)}
              </p>
            )}
          </div>
        </ModalHeader>
        <ModalBody className="pt-6">
          {/* Error */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Session Completion Toggle */}
          <div className="flex items-center gap-4 mb-6">
            <Checkbox
              isSelected={!!session?.completed}
              onValueChange={(checked: boolean) => handleToggleCompleted(checked)}
            >
              Выполнено
            </Checkbox>
            <Chip color={session?.completed ? 'success' : 'warning'}>
              {session?.completed ? 'Выполнено' : 'Не выполнено'}
            </Chip>
          </div>

          {/* Exercises hidden: план отображается в календаре */}

          {/* Session Notes */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Заметки о тренировке:</h4>
              {session && (
                <Button
                  size="sm"
                  variant="light"
                  onPress={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'Отменить' : 'Редактировать'}
                </Button>
              )}
            </div>
            
            {isEditing || !session ? (
              <Textarea
                placeholder="Добавьте заметки о тренировке..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                minRows={3}
              />
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {sessionNotes || 'Нет заметок'}
                </p>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <Button variant="light" onPress={onClose} className="h-11 px-6 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300">
            Закрыть
          </Button>
          {session && isEditing && (
            <Button
              color="primary"
              onPress={handleUpdateSession}
              className="h-11 px-8 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              Сохранить заметки
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </UiModal>
  )
}
