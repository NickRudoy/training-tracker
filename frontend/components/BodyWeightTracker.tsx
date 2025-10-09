"use client"
import React, { useState, useEffect } from 'react'
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react'
import axios from 'axios'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080' })

type BodyWeight = {
  id: number
  profileId: number
  date: string
  weight: number
  notes: string
  createdAt: string
  updatedAt: string
}

type BodyWeightRequest = {
  weight: number
  notes: string
  date: string
}

type Props = {
  profileId: number
}

export default function BodyWeightTracker({ profileId }: Props) {
  const [bodyWeights, setBodyWeights] = useState<BodyWeight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [editingWeight, setEditingWeight] = useState<BodyWeight | null>(null)
  const [formData, setFormData] = useState<BodyWeightRequest>({
    weight: 0,
    notes: '',
    date: new Date().toISOString().split('T')[0]
  })

  // Загружаем данные при монтировании и смене профиля
  useEffect(() => {
    if (profileId) {
      loadBodyWeights()
    }
  }, [profileId])

  const loadBodyWeights = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await api.get<BodyWeight[]>(`/api/profiles/${profileId}/body-weight`)
      setBodyWeights(response.data)
    } catch (err: any) {
      console.error('Failed to load body weights:', err)
      setError(err?.message || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleAddWeight = () => {
    setEditingWeight(null)
    setFormData({
      weight: 0,
      notes: '',
      date: new Date().toISOString().split('T')[0]
    })
    onOpen()
  }

  const handleEditWeight = (weight: BodyWeight) => {
    setEditingWeight(weight)
    setFormData({
      weight: weight.weight,
      notes: weight.notes,
      date: weight.date.split('T')[0]
    })
    onOpen()
  }

  const handleSaveWeight = async () => {
    if (formData.weight <= 0) {
      setError('Вес должен быть больше 0')
      return
    }

    try {
      if (editingWeight) {
        // Обновляем существующую запись
        await api.put(`/api/profiles/${profileId}/body-weight/${editingWeight.id}`, formData)
      } else {
        // Создаем новую запись
        await api.post(`/api/profiles/${profileId}/body-weight`, formData)
      }
      
      await loadBodyWeights()
      onClose()
    } catch (err: any) {
      console.error('Failed to save body weight:', err)
      setError(err?.response?.data?.error || 'Ошибка сохранения')
    }
  }

  const handleDeleteWeight = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
      return
    }

    try {
      await api.delete(`/api/profiles/${profileId}/body-weight/${id}`)
      await loadBodyWeights()
    } catch (err: any) {
      console.error('Failed to delete body weight:', err)
      setError(err?.message || 'Ошибка удаления')
    }
  }

  // Подготавливаем данные для графика
  const chartData = bodyWeights
    .slice()
    .reverse()
    .map(weight => ({
      date: new Date(weight.date).toLocaleDateString('ru-RU', { 
        month: 'short', 
        day: 'numeric' 
      }),
      weight: weight.weight,
      fullDate: weight.date
    }))

  // Кастомный тултип для графика
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
          <p className="font-bold text-slate-900 dark:text-slate-100 mb-2">{label}</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Вес:
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {payload[0].value} кг
            </span>
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Загружаем историю веса...</p>
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
            Трекинг веса тела
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Отслеживайте изменения веса и анализируйте прогресс
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
          onPress={handleAddWeight}
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить вес
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

      {/* Chart */}
      {bodyWeights.length > 0 && (
        <div className="glass shadow-2xl p-6 rounded-2xl border border-white/30 dark:border-slate-700/30">
          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
            График изменения веса
          </h4>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748B"
                  fontSize={12}
                  fontWeight={600}
                />
                <YAxis 
                  stroke="#64748B"
                  fontSize={12}
                  fontWeight={600}
                  tickFormatter={(value) => `${value}кг`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Weight History */}
      <div className="glass shadow-2xl p-6 rounded-2xl border border-white/30 dark:border-slate-700/30">
        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          История записей
        </h4>
        
        {bodyWeights.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Пока нет записей о весе. Добавьте первую запись, чтобы начать отслеживание.
            </p>
            <Button
              className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold"
              onPress={handleAddWeight}
            >
              Добавить первую запись
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {bodyWeights.map((weight) => (
              <div
                key={weight.id}
                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {weight.weight}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {new Date(weight.date).toLocaleDateString('ru-RU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    {weight.notes && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {weight.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="light"
                    className="text-blue-600 dark:text-blue-400"
                    onPress={() => handleEditWeight(weight)}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    className="text-red-600 dark:text-red-400"
                    onPress={() => handleDeleteWeight(weight.id)}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
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
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/50">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {editingWeight ? 'Редактировать вес' : 'Добавить вес'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                    Зафиксируйте текущий вес тела
                  </p>
                </div>
              </ModalHeader>

              <ModalBody className="pt-6 space-y-4">
                <div>
                  <label className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                    Вес (кг)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.weight || ''}
                    onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                    className="w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-all duration-300 shadow-sm hover:shadow-md"
                    placeholder="70.5"
                  />
                </div>

                <div>
                  <label className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                    Дата
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-all duration-300 shadow-sm hover:shadow-md"
                  />
                </div>

                <div>
                  <label className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                    Заметки (необязательно)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Например: утром, после тренировки, перед сном..."
                    className="w-full h-24 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-all duration-300 shadow-sm hover:shadow-md resize-none"
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
                  onPress={handleSaveWeight}
                  isDisabled={formData.weight <= 0}
                  className="h-11 px-8 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                >
                  {editingWeight ? 'Сохранить' : 'Добавить'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
