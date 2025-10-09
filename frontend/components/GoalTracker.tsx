"use client"
import React, { useState, useEffect } from 'react'
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Progress } from '@heroui/react'
import axios from 'axios'

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080' })

type Goal = {
  id: number
  profileId: number
  title: string
  description: string
  type: 'weight' | 'reps' | 'volume' | 'body_weight' | 'custom'
  exercise: string
  targetValue: number
  currentValue: number
  unit: string
  targetDate: string
  achieved: boolean
  achievedDate?: string
  createdAt: string
  updatedAt: string
}

type GoalRequest = {
  title: string
  description: string
  type: 'weight' | 'reps' | 'volume' | 'body_weight' | 'custom'
  exercise: string
  targetValue: number
  unit: string
  targetDate: string
}

type GoalProgressRequest = {
  currentValue: number
}

type Props = {
  profileId: number
  exercises: string[]
}

export default function GoalTracker({ profileId, exercises }: Props) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [formData, setFormData] = useState<GoalRequest>({
    title: '',
    description: '',
    type: 'weight',
    exercise: '',
    targetValue: 0,
    unit: '',
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // через месяц
  })
  const [progressModalOpen, setProgressModalOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [progressValue, setProgressValue] = useState(0)

  // Загружаем данные при монтировании и смене профиля
  useEffect(() => {
    if (profileId) {
      loadGoals()
    }
  }, [profileId])

  const loadGoals = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await api.get<Goal[]>(`/api/profiles/${profileId}/goals`)
      setGoals(response.data)
    } catch (err: any) {
      console.error('Failed to load goals:', err)
      setError(err?.message || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleAddGoal = () => {
    setEditingGoal(null)
    setFormData({
      title: '',
      description: '',
      type: 'weight',
      exercise: '',
      targetValue: 0,
      unit: '',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
    onOpen()
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setFormData({
      title: goal.title,
      description: goal.description,
      type: goal.type,
      exercise: goal.exercise,
      targetValue: goal.targetValue,
      unit: goal.unit,
      targetDate: goal.targetDate.split('T')[0]
    })
    onOpen()
  }

  const handleSaveGoal = async () => {
    if (!formData.title || formData.targetValue <= 0) {
      setError('Заполните все обязательные поля')
      return
    }

    try {
      if (editingGoal) {
        // Обновляем существующую цель
        await api.put(`/api/profiles/${profileId}/goals/${editingGoal.id}`, formData)
      } else {
        // Создаем новую цель
        await api.post(`/api/profiles/${profileId}/goals`, formData)
      }
      
      await loadGoals()
      onClose()
    } catch (err: any) {
      console.error('Failed to save goal:', err)
      setError(err?.response?.data?.error || 'Ошибка сохранения')
    }
  }

  const handleDeleteGoal = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту цель?')) {
      return
    }

    try {
      await api.delete(`/api/profiles/${profileId}/goals/${id}`)
      await loadGoals()
    } catch (err: any) {
      console.error('Failed to delete goal:', err)
      setError(err?.message || 'Ошибка удаления')
    }
  }

  const handleUpdateProgress = (goal: Goal) => {
    setSelectedGoal(goal)
    setProgressValue(goal.currentValue)
    setProgressModalOpen(true)
  }

  const handleSaveProgress = async () => {
    if (!selectedGoal) return

    try {
      await api.put(`/api/profiles/${profileId}/goals/${selectedGoal.id}/progress`, {
        currentValue: progressValue
      })
      
      await loadGoals()
      setProgressModalOpen(false)
    } catch (err: any) {
      console.error('Failed to update progress:', err)
      setError(err?.response?.data?.error || 'Ошибка обновления прогресса')
    }
  }

  const getProgressPercentage = (goal: Goal) => {
    if (goal.targetValue === 0) return 0
    return Math.min((goal.currentValue / goal.targetValue) * 100, 100)
  }

  const getGoalTypeIcon = (type: string) => {
    switch (type) {
      case 'weight':
        return '🏋️'
      case 'reps':
        return '🔢'
      case 'volume':
        return '📊'
      case 'body_weight':
        return '⚖️'
      default:
        return '🎯'
    }
  }

  const getGoalTypeColor = (type: string) => {
    switch (type) {
      case 'weight':
        return 'from-blue-500 to-indigo-600'
      case 'reps':
        return 'from-green-500 to-emerald-600'
      case 'volume':
        return 'from-purple-500 to-violet-600'
      case 'body_weight':
        return 'from-orange-500 to-amber-600'
      default:
        return 'from-pink-500 to-rose-600'
    }
  }

  const getDaysUntilTarget = (targetDate: string) => {
    const target = new Date(targetDate)
    const now = new Date()
    const diffTime = target.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Загружаем цели...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Goal Tracker
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Ставьте цели и отслеживайте прогресс их достижения
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
          onPress={handleAddGoal}
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить цель
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 border border-red-200 dark:border-red-800 shadow-sm">
          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-bold text-red-700 dark:text-red-300">{error}</span>
          <Button
            size="sm"
            variant="light"
            className="text-red-600 dark:text-red-400"
            onPress={() => setError(null)}
          >
            ✕
          </Button>
        </div>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Пока нет целей. Добавьте первую цель, чтобы начать отслеживание прогресса.
          </p>
          <Button
            className="bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold"
            onPress={handleAddGoal}
          >
            Добавить первую цель
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {goals.map((goal) => {
            const progressPercentage = getProgressPercentage(goal)
            const daysLeft = getDaysUntilTarget(goal.targetDate)
            const isOverdue = daysLeft < 0 && !goal.achieved
            
            return (
              <div
                key={goal.id}
                className={`glass shadow-2xl p-6 rounded-2xl border border-white/30 dark:border-slate-700/30 transition-all duration-300 hover:shadow-3xl hover:-translate-y-1 ${
                  goal.achieved ? 'ring-2 ring-green-200 dark:ring-green-800' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getGoalTypeColor(goal.type)} flex items-center justify-center text-white text-xl shadow-lg`}>
                      {getGoalTypeIcon(goal.type)}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {goal.title}
                      </h4>
                      {goal.exercise && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {goal.exercise}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {goal.achieved && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      ДОСТИГНУТО
                    </div>
                  )}
                </div>

                {/* Description */}
                {goal.description && (
                  <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
                    {goal.description}
                  </p>
                )}

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Прогресс
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {goal.currentValue.toFixed(1)} / {goal.targetValue.toFixed(1)} {goal.unit}
                    </span>
                  </div>
                  <Progress
                    value={progressPercentage}
                    className="w-full"
                    color={goal.achieved ? 'success' : progressPercentage > 80 ? 'warning' : 'primary'}
                    size="lg"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {progressPercentage.toFixed(1)}% выполнено
                    </span>
                    <span className={`text-xs font-semibold ${
                      isOverdue ? 'text-red-600 dark:text-red-400' : 
                      daysLeft < 7 ? 'text-orange-600 dark:text-orange-400' : 
                      'text-slate-500 dark:text-slate-400'
                    }`}>
                      {isOverdue ? `Просрочено на ${Math.abs(daysLeft)} дн.` : 
                       daysLeft === 0 ? 'Сегодня' :
                       `${daysLeft} дн. осталось`}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold"
                    onPress={() => handleUpdateProgress(goal)}
                    isDisabled={goal.achieved}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Обновить
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    className="text-blue-600 dark:text-blue-400"
                    onPress={() => handleEditGoal(goal)}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    className="text-red-600 dark:text-red-400"
                    onPress={() => handleDeleteGoal(goal.id)}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Goal Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        placement="center"
        backdrop="opaque"
        classNames={{
          wrapper: "z-[9999]",
          base: "bg-white dark:bg-slate-900",
        }}
      >
        <ModalContent className="bg-white dark:bg-slate-900">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200/50 dark:shadow-violet-900/50">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {editingGoal ? 'Редактировать цель' : 'Добавить цель'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                    Создайте мотивирующую цель для отслеживания прогресса
                  </p>
                </div>
              </ModalHeader>

              <ModalBody className="pt-6 space-y-4">
                <div>
                  <label className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                    Название цели *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-500 dark:focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all duration-300 shadow-sm hover:shadow-md"
                    placeholder="Например: Жим лежа 100кг"
                  />
                </div>

                <div>
                  <label className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Дополнительная информация о цели..."
                    className="w-full h-20 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-500 dark:focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all duration-300 shadow-sm hover:shadow-md resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                      Тип цели *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-500 dark:focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      <option value="weight">Вес (кг)</option>
                      <option value="reps">Повторения</option>
                      <option value="volume">Объем (кг×раз)</option>
                      <option value="body_weight">Вес тела (кг)</option>
                      <option value="custom">Другое</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                      Упражнение
                    </label>
                    <select
                      value={formData.exercise}
                      onChange={(e) => setFormData({ ...formData, exercise: e.target.value })}
                      className="w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-500 dark:focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      <option value="">Выберите упражнение</option>
                      {exercises.map((exercise) => (
                        <option key={exercise} value={exercise}>
                          {exercise}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                      Целевое значение *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.targetValue || ''}
                      onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) || 0 })}
                      className="w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-500 dark:focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all duration-300 shadow-sm hover:shadow-md"
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                      Единица измерения
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-500 dark:focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all duration-300 shadow-sm hover:shadow-md"
                      placeholder="кг"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                    Целевая дата
                  </label>
                  <input
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    className="w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-500 dark:focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all duration-300 shadow-sm hover:shadow-md"
                  />
                </div>
              </ModalBody>

              <ModalFooter className="pt-6 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="light"
                  onPress={onClose}
                  className="h-11 px-6 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300"
                >
                  Отмена
                </Button>
                <Button
                  onPress={handleSaveGoal}
                  isDisabled={!formData.title || formData.targetValue <= 0}
                  className="h-11 px-8 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                >
                  {editingGoal ? 'Сохранить' : 'Добавить'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Progress Update Modal */}
      <Modal 
        isOpen={progressModalOpen} 
        onClose={() => setProgressModalOpen(false)}
        placement="center"
        backdrop="opaque"
        classNames={{
          wrapper: "z-[9999]",
          base: "bg-white dark:bg-slate-900",
        }}
      >
        <ModalContent className="bg-white dark:bg-slate-900">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200/50 dark:shadow-blue-900/50">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Обновить прогресс
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                    {selectedGoal?.title}
                  </p>
                </div>
              </ModalHeader>

              <ModalBody className="pt-6 space-y-4">
                <div>
                  <label className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                    Текущее значение ({selectedGoal?.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={progressValue || ''}
                    onChange={(e) => setProgressValue(parseFloat(e.target.value) || 0)}
                    className="w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all duration-300 shadow-sm hover:shadow-md"
                    placeholder="0"
                  />
                </div>

                {selectedGoal && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Прогресс
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {progressValue.toFixed(1)} / {selectedGoal.targetValue.toFixed(1)} {selectedGoal.unit}
                      </span>
                    </div>
                    <Progress
                      value={getProgressPercentage({ ...selectedGoal, currentValue: progressValue })}
                      className="w-full"
                      color={progressValue >= selectedGoal.targetValue ? 'success' : 'primary'}
                      size="lg"
                    />
                    <div className="text-center mt-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {getProgressPercentage({ ...selectedGoal, currentValue: progressValue }).toFixed(1)}% выполнено
                      </span>
                    </div>
                  </div>
                )}
              </ModalBody>

              <ModalFooter className="pt-6 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="light"
                  onPress={() => setProgressModalOpen(false)}
                  className="h-11 px-6 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300"
                >
                  Отмена
                </Button>
                <Button
                  onPress={handleSaveProgress}
                  className="h-11 px-8 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                >
                  Обновить прогресс
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
