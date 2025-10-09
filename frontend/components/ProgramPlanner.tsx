"use client"
import React, { useState, useEffect } from 'react'
import { Button, Card, CardBody, CardHeader, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Input, Select, SelectItem, Chip, Spinner, Textarea } from '@heroui/react'
import UiModal from './UiModal'
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

interface Props {
  profileId: number
  programs: TrainingProgram[]
  currentProgram: TrainingProgram | null
  exercises: string[]
  onProgramChange: (program: TrainingProgram | null) => void
  onProgramsUpdate: (programs: TrainingProgram[]) => void
}

export default function ProgramPlanner({ profileId, programs, currentProgram, exercises, onProgramChange, onProgramsUpdate }: Props) {
  const [programExercises, setProgramExercises] = useState<ProgramExercise[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<number>(1) // 1-7 (понедельник-воскресенье)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [editingExercise, setEditingExercise] = useState<ProgramExercise | null>(null)
  const {
    isOpen: isProgramEditOpen,
    onOpen: onOpenProgramEdit,
    onClose: onCloseProgramEdit
  } = useDisclosure()
  const [programForm, setProgramForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    isActive: true,
  })

  const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

  // Загрузка упражнений программы
  useEffect(() => {
    if (currentProgram) {
      loadProgramExercises()
    }
  }, [currentProgram])

  const loadProgramExercises = async () => {
    if (!currentProgram) return

    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/api/profiles/${profileId}/programs/${currentProgram.id}/exercises`)
      setProgramExercises(response.data)
    } catch (err: any) {
      console.error('Failed to load program exercises:', err)
      setError(err?.response?.data?.error || 'Ошибка загрузки упражнений программы')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProgram = async () => {
    try {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1) // Добавляем месяц
      
      const response = await api.post(`/api/profiles/${profileId}/programs`, {
        name: 'Новая программа',
        description: '',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        isActive: true
      })
      
      const newPrograms = [...programs, response.data]
      onProgramsUpdate(newPrograms)
      onProgramChange(response.data)

      // Открываем модал редактирования сразу после создания
      setProgramForm({
        name: response.data.name || '',
        description: response.data.description || '',
        startDate: response.data.startDate?.split('T')[0] || startDate.toISOString().split('T')[0],
        endDate: response.data.endDate?.split('T')[0] || endDate.toISOString().split('T')[0],
        isActive: true,
      })
      onOpenProgramEdit()
    } catch (err: any) {
      console.error('Failed to create program:', err)
      setError(err?.response?.data?.error || 'Ошибка создания программы')
    }
  }

  const openEditProgram = () => {
    if (!currentProgram) return
    setProgramForm({
      name: currentProgram.name || '',
      description: currentProgram.description || '',
      startDate: (currentProgram.startDate || '').toString().split('T')[0],
      endDate: (currentProgram.endDate || '').toString().split('T')[0],
      isActive: !!currentProgram.isActive,
    })
    onOpenProgramEdit()
  }

  const saveProgram = async () => {
    if (!currentProgram) return
    try {
      const response = await api.put(`/api/profiles/${profileId}/programs/${currentProgram.id}`, {
        name: programForm.name,
        description: programForm.description,
        startDate: programForm.startDate,
        endDate: programForm.endDate,
        isActive: programForm.isActive,
      })
      const updated = response.data
      // Если сделали активной — деактивируем остальные и активируем текущую локально
      const updatedPrograms = programs.map(p => {
        if (p.id === updated.id) {
          return updated
        }
        return programForm.isActive ? { ...p, isActive: false } : p
      })
      onProgramsUpdate(updatedPrograms)
      onProgramChange(updated)
      onCloseProgramEdit()
    } catch (err: any) {
      console.error('Failed to update program:', err)
      setError(err?.response?.data?.error || 'Ошибка обновления программы')
    }
  }

  const deleteProgram = async () => {
    if (!currentProgram) return
    const ok = typeof window !== 'undefined' ? window.confirm('Удалить текущую программу?') : true
    if (!ok) return
    try {
      await api.delete(`/api/profiles/${profileId}/programs/${currentProgram.id}`)
      const remaining = programs.filter(p => p.id !== currentProgram.id)
      onProgramsUpdate(remaining)
      onProgramChange(remaining[0] || null)
    } catch (err: any) {
      console.error('Failed to delete program:', err)
      setError(err?.response?.data?.error || 'Ошибка удаления программы')
    }
  }

  const activateProgram = async () => {
    if (!currentProgram) return
    try {
      const response = await api.put(`/api/profiles/${profileId}/programs/${currentProgram.id}`, {
        name: currentProgram.name,
        description: currentProgram.description,
        startDate: (currentProgram.startDate || '').toString().split('T')[0],
        endDate: (currentProgram.endDate || '').toString().split('T')[0],
        isActive: true,
      })
      const updated = response.data
      const updatedPrograms = programs.map(p => p.id === updated.id ? updated : { ...p, isActive: false })
      onProgramsUpdate(updatedPrograms)
      onProgramChange(updated)
    } catch (err: any) {
      console.error('Failed to activate program:', err)
      setError(err?.response?.data?.error || 'Ошибка активации программы')
    }
  }

  const handleAddExercise = () => {
    setEditingExercise({
      programId: currentProgram?.id || 0,
      exercise: '',
      dayOfWeek: selectedDay,
      order: programExercises.filter(ex => ex.dayOfWeek === selectedDay).length + 1,
      sets: 3,
      reps: 8,
      weight: 20, // Устанавливаем разумный вес по умолчанию
      notes: ''
    })
    onOpen()
  }

  const handleEditExercise = (exercise: ProgramExercise) => {
    setEditingExercise(exercise)
    onOpen()
  }

  const handleSaveExercise = async () => {
    if (!editingExercise || !currentProgram) return

    try {
      if (editingExercise.id) {
        // Обновление существующего упражнения
        const response = await api.put(`/api/profiles/${profileId}/programs/${currentProgram.id}/exercises/${editingExercise.id}`, editingExercise)
        setProgramExercises(prev => prev.map(ex => ex.id === editingExercise.id ? response.data : ex))
      } else {
        // Создание нового упражнения
        const response = await api.post(`/api/profiles/${profileId}/programs/${currentProgram.id}/exercises`, editingExercise)
        setProgramExercises(prev => [...prev, response.data])
      }
      
      setEditingExercise(null)
      onClose()
    } catch (err: any) {
      console.error('Failed to save exercise:', err)
      setError(err?.response?.data?.error || 'Ошибка сохранения упражнения')
    }
  }

  const handleDeleteExercise = async (exerciseId: number) => {
    if (!currentProgram) return

    try {
      await api.delete(`/api/profiles/${profileId}/programs/${currentProgram.id}/exercises/${exerciseId}`)
      setProgramExercises(prev => prev.filter(ex => ex.id !== exerciseId))
    } catch (err: any) {
      console.error('Failed to delete exercise:', err)
      setError(err?.response?.data?.error || 'Ошибка удаления упражнения')
    }
  }

  const getExercisesForDay = (day: number) => {
    return programExercises
      .filter(ex => ex.dayOfWeek === day)
      .sort((a, b) => a.order - b.order)
  }

  const moveExercise = async (exerciseId: number, direction: 'up' | 'down') => {
    const exercise = programExercises.find(ex => ex.id === exerciseId)
    if (!exercise || !currentProgram) return

    const dayExercises = getExercisesForDay(exercise.dayOfWeek)
    const currentIndex = dayExercises.findIndex(ex => ex.id === exerciseId)
    
    if (direction === 'up' && currentIndex > 0) {
      const newOrder = dayExercises[currentIndex - 1].order
      const oldOrder = exercise.order
      
      // Меняем порядок
      const updatedExercises = programExercises.map(ex => {
        if (ex.id === exerciseId) {
          return { ...ex, order: newOrder }
        } else if (ex.dayOfWeek === exercise.dayOfWeek && ex.order === newOrder) {
          return { ...ex, order: oldOrder }
        }
        return ex
      })
      
      setProgramExercises(updatedExercises)
      
      // Сохраняем на сервере
      try {
        await api.put(`/api/profiles/${profileId}/programs/${currentProgram.id}/exercises/${exerciseId}`, {
          ...exercise,
          order: newOrder
        })
        await api.put(`/api/profiles/${profileId}/programs/${currentProgram.id}/exercises/${dayExercises[currentIndex - 1].id}`, {
          ...dayExercises[currentIndex - 1],
          order: oldOrder
        })
      } catch (err) {
        console.error('Failed to update exercise order:', err)
      }
    } else if (direction === 'down' && currentIndex < dayExercises.length - 1) {
      const newOrder = dayExercises[currentIndex + 1].order
      const oldOrder = exercise.order
      
      // Меняем порядок
      const updatedExercises = programExercises.map(ex => {
        if (ex.id === exerciseId) {
          return { ...ex, order: newOrder }
        } else if (ex.dayOfWeek === exercise.dayOfWeek && ex.order === newOrder) {
          return { ...ex, order: oldOrder }
        }
        return ex
      })
      
      setProgramExercises(updatedExercises)
      
      // Сохраняем на сервере
      try {
        await api.put(`/api/profiles/${profileId}/programs/${currentProgram.id}/exercises/${exerciseId}`, {
          ...exercise,
          order: newOrder
        })
        await api.put(`/api/profiles/${profileId}/programs/${currentProgram.id}/exercises/${dayExercises[currentIndex + 1].id}`, {
          ...dayExercises[currentIndex + 1],
          order: oldOrder
        })
      } catch (err) {
        console.error('Failed to update exercise order:', err)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Program Management */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Планировщик программы
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Создайте и настройте свою программу тренировок
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            color="primary"
            onPress={handleCreateProgram}
          >
            {currentProgram ? 'Новая программа' : 'Создать программу'}
          </Button>
          {currentProgram && (
            <Button
              color="success"
              onPress={handleAddExercise}
            >
              Добавить упражнение
            </Button>
          )}
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

      {!currentProgram ? (
        <Card>
          <CardBody className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Создайте свою первую программу
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Начните с создания программы тренировок, чтобы планировать свои занятия
            </p>
            <Button
              color="primary"
              size="lg"
              onPress={handleCreateProgram}
            >
              Создать программу
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Program Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{currentProgram.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {currentProgram.description || 'Без описания'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Chip color="primary" variant="flat">
                    {currentProgram.isActive ? 'Активная' : 'Неактивная'}
                  </Chip>
                  {!currentProgram.isActive && (
                    <Button size="sm" color="primary" variant="flat" onPress={activateProgram}>Сделать активной</Button>
                  )}
                  <Button size="sm" variant="light" onPress={openEditProgram}>Редактировать</Button>
                  <Button size="sm" color="danger" variant="flat" onPress={deleteProgram}>Удалить</Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Day Selector */}
          <Card>
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((day, index) => (
                  <Button
                    key={index + 1}
                    variant={selectedDay === index + 1 ? 'solid' : 'bordered'}
                    color={selectedDay === index + 1 ? 'primary' : 'default'}
                    size="sm"
                    onPress={() => setSelectedDay(index + 1)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Exercises for Selected Day */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {dayNames[selectedDay - 1]} - Упражнения
                </h3>
                <Button
                  color="primary"
                  size="sm"
                  onPress={handleAddExercise}
                >
                  Добавить упражнение
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {getExercisesForDay(selectedDay).length > 0 ? (
                <div className="space-y-3">
                  {getExercisesForDay(selectedDay).map((exercise, index) => (
                    <div key={exercise.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="light"
                          isDisabled={index === 0}
                          onPress={() => moveExercise(exercise.id!, 'up')}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </Button>
                        <Button
                          size="sm"
                          variant="light"
                          isDisabled={index === getExercisesForDay(selectedDay).length - 1}
                          onPress={() => moveExercise(exercise.id!, 'down')}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </Button>
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold">{exercise.exercise}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {exercise.sets} × {exercise.reps} × {exercise.weight}кг
                        </p>
                        {exercise.notes && (
                          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                            {exercise.notes}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="light"
                          onPress={() => handleEditExercise(exercise)}
                        >
                          Редактировать
                        </Button>
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          onPress={() => handleDeleteExercise(exercise.id!)}
                        >
                          Удалить
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    Нет упражнений для {dayNames[selectedDay - 1].toLowerCase()}
                  </p>
                  <Button
                    color="primary"
                    onPress={handleAddExercise}
                  >
                    Добавить первое упражнение
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Exercise Edit Modal */}
      <UiModal 
        isOpen={isOpen} 
        onClose={onClose} 
        size="2xl"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {editingExercise?.id ? 'Редактировать упражнение' : 'Добавить упражнение'}
            </h3>
          </ModalHeader>
          <ModalBody className="pt-6">
            {editingExercise && (
              <div className="space-y-4">
                <Select
                  label="Упражнение"
                  labelPlacement="outside"
                  placeholder="Выберите упражнение"
                  selectedKeys={editingExercise.exercise ? [editingExercise.exercise] : []}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string
                    setEditingExercise(prev => prev ? { ...prev, exercise: selected || '' } : null)
                  }}
                >
                  {exercises.map((exercise) => (
                    <SelectItem key={exercise} value={exercise}>
                      {exercise}
                    </SelectItem>
                  ))}
                </Select>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Подходы"
                    labelPlacement="outside"
                    type="number"
                    min="1"
                    value={editingExercise.sets.toString()}
                    onChange={(e) => setEditingExercise(prev => prev ? { ...prev, sets: parseInt(e.target.value) || 1 } : null)}
                  />
                  <Input
                    label="Повторы"
                    labelPlacement="outside"
                    type="number"
                    min="1"
                    value={editingExercise.reps.toString()}
                    onChange={(e) => setEditingExercise(prev => prev ? { ...prev, reps: parseInt(e.target.value) || 1 } : null)}
                  />
                  <Input
                    label="Вес (кг)"
                    labelPlacement="outside"
                    type="number"
                    min="0"
                    step="0.5"
                    value={editingExercise.weight.toString()}
                    onChange={(e) => setEditingExercise(prev => prev ? { ...prev, weight: parseFloat(e.target.value) || 0 } : null)}
                  />
                </div>

                <Textarea
                  label="Заметки"
                  labelPlacement="outside"
                  placeholder="Дополнительные заметки..."
                  value={editingExercise.notes}
                  onChange={(e) => setEditingExercise(prev => prev ? { ...prev, notes: e.target.value } : null)}
                />
              </div>
            )}
          </ModalBody>
          <ModalFooter className="pt-6 border-t border-slate-200 dark:border-slate-700">
            <Button variant="light" onPress={onClose} className="h-11 px-6 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300">
              Отмена
            </Button>
            <Button
              color="primary"
              onPress={handleSaveExercise}
              isDisabled={!editingExercise?.exercise}
              className="h-11 px-8 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              {editingExercise?.id ? 'Сохранить' : 'Добавить'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </UiModal>

      {/* Program Edit Modal */}
      <UiModal 
        isOpen={isProgramEditOpen} 
        onClose={onCloseProgramEdit} 
        size="2xl"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Редактировать программу
            </h3>
          </ModalHeader>
          <ModalBody className="pt-6">
            <div className="space-y-4">
              <Input
                label="Название"
                labelPlacement="outside"
                placeholder="Введите название программы"
                value={programForm.name}
                onChange={(e) => setProgramForm(prev => ({ ...prev, name: e.target.value }))}
              />
              <Textarea
                label="Описание"
                labelPlacement="outside"
                placeholder="Краткое описание программы"
                value={programForm.description}
                onChange={(e) => setProgramForm(prev => ({ ...prev, description: e.target.value }))}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Начало"
                  labelPlacement="outside"
                  type="date"
                  value={programForm.startDate}
                  onChange={(e) => setProgramForm(prev => ({ ...prev, startDate: e.target.value }))}
                />
                <Input
                  label="Окончание"
                  labelPlacement="outside"
                  type="date"
                  value={programForm.endDate}
                  onChange={(e) => setProgramForm(prev => ({ ...prev, endDate: e.target.value }))}
                />
                <Select
                  label="Статус"
                  labelPlacement="outside"
                  selectedKeys={[programForm.isActive ? 'active' : 'inactive']}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as string
                    setProgramForm(prev => ({ ...prev, isActive: key === 'active' }))
                  }}
                >
                  <SelectItem key="active">Активная</SelectItem>
                  <SelectItem key="inactive">Неактивная</SelectItem>
                </Select>
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="pt-6 border-t border-slate-200 dark:border-slate-700">
            <Button variant="light" onPress={onCloseProgramEdit} className="h-11 px-6 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300">
              Отмена
            </Button>
            <Button
              color="primary"
              onPress={saveProgram}
              isDisabled={!programForm.name}
              className="h-11 px-8 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              Сохранить
            </Button>
          </ModalFooter>
        </ModalContent>
      </UiModal>
    </div>
  )
}
