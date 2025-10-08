"use client"
import React, { useState, useEffect } from 'react'
import { Button, Card, CardBody, CardHeader, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Input, Textarea, Select, SelectItem, Chip, Spinner } from '@heroui/react'
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
})

interface TrainingSession {
  id: number
  profileId: number
  date: string
  duration: number
  notes: string
  energy: number
  mood: number
  soreness: number
  createdAt: string
  updatedAt: string
}

interface Set {
  weight: number
  reps: number
  rpe: number
}

interface TrainingSessionExercise {
  id: number
  trainingSessionId: number
  exercise: string
  sets: Set[]
  notes: string
  createdAt: string
  updatedAt: string
}

interface TrainingSessionWithExercises extends TrainingSession {
  exercises: TrainingSessionExercise[]
}

interface TrainingHistoryResponse {
  sessions: TrainingSessionWithExercises[]
  totalCount: number
  page: number
  pageSize: number
  hasMore: boolean
}

interface Props {
  profileId: number
}

export default function TrainingHistory({ profileId }: Props) {
  const [sessions, setSessions] = useState<TrainingSessionWithExercises[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [selectedSession, setSelectedSession] = useState<TrainingSessionWithExercises | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [exercises, setExercises] = useState<string[]>([])
  const [trainingProgram, setTrainingProgram] = useState<any[]>([]) // Программа тренировок
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]) // Выбранные упражнения для тренировки

  const { isOpen, onOpen, onClose } = useDisclosure()
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure()

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    duration: 60,
    notes: '',
    energy: 5,
    mood: 5,
    soreness: 1,
  })

  const [exerciseForm, setExerciseForm] = useState({
    exercise: '',
    sets: [{ weight: 0, reps: 0, rpe: 5 }] as Set[],
    notes: '',
  })

  useEffect(() => {
    if (profileId) {
      loadSessions()
      loadExercises()
      loadTrainingProgram()
    }
  }, [profileId, page])

  const loadSessions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.get<TrainingHistoryResponse>(
        `/api/profiles/${profileId}/training-history?page=${page}&pageSize=10`
      )

      if (page === 1) {
        setSessions(response.data.sessions)
      } else {
        setSessions(prev => [...prev, ...response.data.sessions])
      }

      setHasMore(response.data.hasMore)
    } catch (err: any) {
      console.error('Failed to load training history:', err)
      setError(err?.response?.data?.error || 'Ошибка загрузки истории тренировок')
    } finally {
      setLoading(false)
    }
  }

  const loadExercises = async () => {
    try {
      const response = await api.get<{ exercises: string[] }>(`/api/profiles/${profileId}/exercises`)
      setExercises(response.data.exercises)
    } catch (err) {
      console.error('Failed to load exercises:', err)
    }
  }

  const loadTrainingProgram = async () => {
    try {
      // Загружаем программы тренировок
      const programsResponse = await api.get(`/api/profiles/${profileId}/programs`)
      const programs = programsResponse.data
      
      // Находим активную программу
      const activeProgram = programs.find((p: any) => p.isActive)
      
      if (activeProgram) {
        // Загружаем упражнения активной программы
        const exercisesResponse = await api.get(`/api/profiles/${profileId}/programs/${activeProgram.id}/exercises`)
        setTrainingProgram(exercisesResponse.data)
      } else {
        // Если нет активной программы, загружаем из старой таблицы
        const response = await api.get(`/api/trainings?profileId=${profileId}`)
        setTrainingProgram(response.data)
      }
    } catch (err) {
      console.error('Failed to load training program:', err)
      // Fallback к старой таблице
      try {
        const response = await api.get(`/api/trainings?profileId=${profileId}`)
        setTrainingProgram(response.data)
      } catch (fallbackErr) {
        console.error('Failed to load fallback training program:', fallbackErr)
      }
    }
  }

  const handleCreateSession = async () => {
    try {
      // Создаем сессию тренировки
      const sessionResponse = await api.post(`/api/profiles/${profileId}/training-sessions`, formData)
      const sessionId = sessionResponse.data.id

      // Создаем упражнения для выбранных упражнений
      for (const exerciseName of selectedExercises) {
        // Находим упражнение в программе для получения параметров
        const programExercise = trainingProgram.find((ex: any) => ex.exercise === exerciseName)
        
        let sets = [{ weight: 0, reps: 8, rpe: 7 }]
        let notes = ''
        
        if (programExercise) {
          // Если это упражнение из программы, используем его параметры
          if (programExercise.sets && programExercise.reps && programExercise.weight) {
            sets = [{
              weight: programExercise.weight,
              reps: programExercise.reps,
              rpe: 7
            }]
            notes = programExercise.notes || ''
          } else if (programExercise.week4d6Kg || programExercise.week3d6Kg || programExercise.week2d6Kg || programExercise.week1d6Kg) {
            // Fallback для старой структуры данных
            const lastWeight = programExercise.week4d6Kg || programExercise.week3d6Kg || programExercise.week2d6Kg || programExercise.week1d6Kg || 0
            sets = [{
              weight: lastWeight,
              reps: 8,
              rpe: 7
            }]
          }
        }

        // Создаем упражнение
        const exerciseData = {
          exercise: exerciseName,
          sets: sets,
          notes: notes
        }

        await api.post(`/api/profiles/${profileId}/training-sessions/${sessionId}/exercises`, exerciseData)
      }
      
      // Перезагружаем список сессий
      await loadSessions()
      
      // Сбрасываем форму
      setFormData({
        date: new Date().toISOString().split('T')[0],
        duration: 60,
        notes: '',
        energy: 5,
        mood: 5,
        soreness: 1,
      })
      setSelectedExercises([])
      
      onCreateClose()
    } catch (err: any) {
      console.error('Failed to create session:', err)
      setError(err?.response?.data?.error || 'Ошибка создания тренировки')
    }
  }

  const handleAddExercise = async () => {
    if (!selectedSession || !exerciseForm.exercise) return

    try {
      const response = await api.post(
        `/api/profiles/${profileId}/training-sessions/${selectedSession.id}/exercises`,
        exerciseForm
      )

      setSessions(prev =>
        prev.map(session =>
          session.id === selectedSession.id
            ? { ...session, exercises: [...session.exercises, response.data] }
            : session
        )
      )

      setExerciseForm({
        exercise: '',
        sets: [{ weight: 0, reps: 0, rpe: 5 }],
        notes: '',
      })
    } catch (err: any) {
      console.error('Failed to add exercise:', err)
      setError(err?.response?.data?.error || 'Ошибка добавления упражнения')
    }
  }

  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm('Удалить эту тренировку?')) return

    try {
      await api.delete(`/api/profiles/${profileId}/training-sessions/${sessionId}`)
      setSessions(prev => prev.filter(session => session.id !== sessionId))
    } catch (err: any) {
      console.error('Failed to delete session:', err)
      setError(err?.response?.data?.error || 'Ошибка удаления тренировки')
    }
  }

  const handleDeleteExercise = async (sessionId: number, exerciseId: number) => {
    if (!confirm('Удалить это упражнение?')) return

    try {
      await api.delete(`/api/profiles/${profileId}/training-sessions/${sessionId}/exercises/${exerciseId}`)
      
      setSessions(prev =>
        prev.map(session =>
          session.id === sessionId
            ? { ...session, exercises: session.exercises.filter(ex => ex.id !== exerciseId) }
            : session
        )
      )
    } catch (err: any) {
      console.error('Failed to delete exercise:', err)
      setError(err?.response?.data?.error || 'Ошибка удаления упражнения')
    }
  }

  const addSet = () => {
    setExerciseForm(prev => ({
      ...prev,
      sets: [...prev.sets, { weight: 0, reps: 0, rpe: 5 }]
    }))
  }

  const removeSet = (index: number) => {
    setExerciseForm(prev => ({
      ...prev,
      sets: prev.sets.filter((_, i) => i !== index)
    }))
  }

  const updateSet = (index: number, field: keyof Set, value: number) => {
    setExerciseForm(prev => ({
      ...prev,
      sets: prev.sets.map((set, i) => 
        i === index ? { ...set, [field]: value } : set
      )
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`
  }

  const getEnergyColor = (energy: number) => {
    if (energy >= 8) return 'success'
    if (energy >= 6) return 'warning'
    return 'danger'
  }

  const getMoodColor = (mood: number) => {
    if (mood >= 8) return 'success'
    if (mood >= 6) return 'warning'
    return 'danger'
  }

  const getSorenessColor = (soreness: number) => {
    if (soreness <= 3) return 'success'
    if (soreness <= 6) return 'warning'
    return 'danger'
  }

  if (loading && (!sessions || sessions.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">История тренировок</h2>
        <Button
          color="primary"
          startContent={<span>➕</span>}
          onPress={onCreateOpen}
        >
          Новая тренировка
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions && sessions.length > 0 ? sessions.map((session) => (
          <Card key={session.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <span className="text-blue-500 text-xl">📅</span>
                <div>
                  <h3 className="text-lg font-semibold">
                    {formatDate(session.date)}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span>⏱️</span>
                      {formatTime(session.duration)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span>⚡</span>
                      <Chip size="sm" color={getEnergyColor(session.energy)}>
                        Энергия: {session.energy}/10
                      </Chip>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>❤️</span>
                      <Chip size="sm" color={getMoodColor(session.mood)}>
                        Настроение: {session.mood}/10
                      </Chip>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>💪</span>
                      <Chip size="sm" color={getSorenessColor(session.soreness)}>
                        Болезненность: {session.soreness}/10
                      </Chip>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="light"
                  startContent={<span>✏️</span>}
                  onPress={() => {
                    setSelectedSession(session)
                    onOpen()
                  }}
                >
                  Подробнее
                </Button>
                <Button
                  size="sm"
                  color="danger"
                  variant="light"
                  startContent={<span>🗑️</span>}
                  onPress={() => handleDeleteSession(session.id)}
                >
                  Удалить
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {session.exercises.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">Упражнения:</h4>
                  <div className="flex flex-wrap gap-2">
                    {session.exercises.map((exercise) => (
                      <Chip key={exercise.id} variant="flat" color="primary">
                        {exercise.exercise} ({exercise.sets.length} подходов)
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Нет упражнений</p>
              )}
              {session.notes && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600">{session.notes}</p>
                </div>
              )}
            </CardBody>
          </Card>
        )) : (
          <div className="text-center py-8">
            <div className="text-gray-500 text-lg mb-2">📝</div>
            <p className="text-gray-500">Нет тренировок в истории</p>
            <p className="text-sm text-gray-400 mt-1">Создайте первую тренировку, нажав кнопку "Новая тренировка"</p>
          </div>
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="light"
            onPress={() => setPage(prev => prev + 1)}
            isLoading={loading}
          >
            Загрузить еще
          </Button>
        </div>
      )}

      {/* Create Session Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="5xl" backdrop="opaque">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <span className="text-2xl">💪</span>
              <div>
                <h2 className="text-xl font-bold">Новая тренировка</h2>
                <p className="text-sm text-gray-500">Выберите упражнения из программы и заполните данные</p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-6">
              {/* Основная информация */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">📅 Информация о тренировке</h3>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Дата тренировки"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                    <Input
                      label="Длительность (минуты)"
                      type="number"
                      value={formData.duration.toString()}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    />
                    <div className="md:col-span-2">
                      <Textarea
                        label="Заметки о тренировке"
                        placeholder="Как прошла тренировка, самочувствие, планы..."
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Самочувствие */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">😊 Самочувствие</h3>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">⚡ Энергия (1-10)</label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.energy.toString()}
                        onChange={(e) => setFormData(prev => ({ ...prev, energy: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">❤️ Настроение (1-10)</label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.mood.toString()}
                        onChange={(e) => setFormData(prev => ({ ...prev, mood: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">💪 Болезненность (1-10)</label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.soreness.toString()}
                        onChange={(e) => setFormData(prev => ({ ...prev, soreness: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Выбор упражнений */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">🏋️ Выберите упражнения</h3>
                  <p className="text-sm text-gray-500">Выберите упражнения из вашей программы тренировок</p>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {trainingProgram.map((exercise, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          id={`exercise-${index}`}
                          checked={selectedExercises.includes(exercise.exercise)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExercises(prev => [...prev, exercise.exercise])
                            } else {
                              setSelectedExercises(prev => prev.filter(ex => ex !== exercise.exercise))
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`exercise-${index}`} className="flex-1 cursor-pointer">
                          <div className="font-medium">{exercise.exercise}</div>
                          <div className="text-sm text-gray-500">
                            {exercise.sets && exercise.reps && exercise.weight ? 
                              `${exercise.sets} × ${exercise.reps} × ${exercise.weight}кг` :
                              `Последний вес: ${exercise.week4d6Kg || exercise.week3d6Kg || exercise.week2d6Kg || exercise.week1d6Kg || 0} кг`
                            }
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedExercises.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">
                        Выбрано упражнений: {selectedExercises.length}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedExercises.map((exercise, index) => (
                          <Chip key={index} size="sm" color="primary">
                            {exercise}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onCreateClose}>
              Отмена
            </Button>
            <Button 
              color="primary" 
              onPress={handleCreateSession}
              isDisabled={selectedExercises.length === 0}
            >
              Создать тренировку
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Session Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl" backdrop="opaque">
        <ModalContent>
          <ModalHeader>
            Тренировка от {selectedSession && formatDate(selectedSession.date)}
          </ModalHeader>
          <ModalBody>
            {selectedSession && (
              <div className="space-y-6">
                {/* Session Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Информация о тренировке</h4>
                    <div className="space-y-2 text-sm">
                      <div>Длительность: {formatTime(selectedSession.duration)}</div>
                      <div>Энергия: {selectedSession.energy}/10</div>
                      <div>Настроение: {selectedSession.mood}/10</div>
                      <div>Болезненность: {selectedSession.soreness}/10</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Заметки</h4>
                    <p className="text-sm text-gray-600">
                      {selectedSession.notes || 'Нет заметок'}
                    </p>
                  </div>
                </div>

                {/* Exercises */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium">Упражнения</h4>
                    <Button
                      size="sm"
                      color="primary"
                      startContent={<span>➕</span>}
                      onPress={() => {
                        setExerciseForm({
                          exercise: '',
                          sets: [{ weight: 0, reps: 0, rpe: 5 }],
                          notes: '',
                        })
                        setIsCreating(true)
                      }}
                    >
                      Добавить упражнение
                    </Button>
                  </div>

                  {selectedSession.exercises.map((exercise) => (
                    <Card key={exercise.id} className="mb-4">
                      <CardHeader className="flex justify-between items-start">
                        <h5 className="font-medium">{exercise.exercise}</h5>
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          startContent={<span>🗑️</span>}
                          onPress={() => handleDeleteExercise(selectedSession.id, exercise.id)}
                        >
                          Удалить
                        </Button>
                      </CardHeader>
                      <CardBody>
                        <div className="space-y-2">
                          {exercise.sets.map((set, index) => (
                            <div key={index} className="flex items-center gap-4 text-sm">
                              <span className="w-8">#{index + 1}</span>
                              <span>{set.weight}кг</span>
                              <span>{set.reps} раз</span>
                              <span>RPE: {set.rpe}</span>
                            </div>
                          ))}
                          {exercise.notes && (
                            <p className="text-sm text-gray-600 mt-2">{exercise.notes}</p>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  ))}

                  {selectedSession.exercises.length === 0 && (
                    <p className="text-gray-500 text-center py-8">Нет упражнений</p>
                  )}
                </div>

                {/* Add Exercise Form */}
                {isCreating && (
                  <Card>
                    <CardHeader>
                      <h5 className="font-medium">Добавить упражнение</h5>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-4">
                        <Select
                          label="Упражнение"
                          placeholder="Выберите упражнение"
                          selectedKeys={exerciseForm.exercise ? [exerciseForm.exercise] : []}
                          onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as string
                            setExerciseForm(prev => ({ ...prev, exercise: selected || '' }))
                          }}
                        >
                          {exercises.map((exercise) => (
                            <SelectItem key={exercise}>
                              {exercise}
                            </SelectItem>
                          ))}
                        </Select>

                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium">Подходы</label>
                            <Button size="sm" variant="light" onPress={addSet}>
                              Добавить подход
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {exerciseForm.sets.map((set, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="w-8 text-sm">#{index + 1}</span>
                                <Input
                                  size="sm"
                                  placeholder="Вес"
                                  type="number"
                                  value={set.weight.toString()}
                                  onChange={(e) => updateSet(index, 'weight', parseFloat(e.target.value) || 0)}
                                />
                                <Input
                                  size="sm"
                                  placeholder="Повторы"
                                  type="number"
                                  value={set.reps.toString()}
                                  onChange={(e) => updateSet(index, 'reps', parseInt(e.target.value) || 0)}
                                />
                                <Input
                                  size="sm"
                                  placeholder="RPE"
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={set.rpe.toString()}
                                  onChange={(e) => updateSet(index, 'rpe', parseInt(e.target.value) || 1)}
                                />
                                {exerciseForm.sets.length > 1 && (
                                  <Button
                                    size="sm"
                                    color="danger"
                                    variant="light"
                                    onPress={() => removeSet(index)}
                                  >
                                    <span>🗑️</span>
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <Textarea
                          label="Заметки к упражнению"
                          placeholder="Заметки..."
                          value={exerciseForm.notes}
                          onChange={(e) => setExerciseForm(prev => ({ ...prev, notes: e.target.value }))}
                        />

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            color="primary"
                            onPress={handleAddExercise}
                            isDisabled={!exerciseForm.exercise}
                          >
                            Добавить
                          </Button>
                          <Button
                            size="sm"
                            variant="light"
                            onPress={() => setIsCreating(false)}
                          >
                            Отмена
                          </Button>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )}
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
