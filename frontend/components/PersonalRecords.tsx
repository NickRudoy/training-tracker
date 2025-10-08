"use client"
import React, { useState, useEffect } from 'react'
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react'
import axios from 'axios'

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080' })

type PersonalRecord = {
  id: number
  profileId: number
  exercise: string
  weight: number
  reps: int
  date: string
  createdAt: string
  updatedAt: string
}

type PersonalRecordRequest = {
  exercise: string
  weight: number
  reps: int
  date: string
}

type Props = {
  profileId: number
  exercises: string[]
}

export default function PersonalRecords({ profileId, exercises }: Props) {
  const [records, setRecords] = useState<PersonalRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [editingRecord, setEditingRecord] = useState<PersonalRecord | null>(null)
  const [formData, setFormData] = useState<PersonalRecordRequest>({
    exercise: '',
    weight: 0,
    reps: 1,
    date: new Date().toISOString().split('T')[0]
  })
  const [selectedExercise, setSelectedExercise] = useState<string>('')

  // Загружаем данные при монтировании и смене профиля
  useEffect(() => {
    if (profileId) {
      loadPersonalRecords()
    }
  }, [profileId])

  const loadPersonalRecords = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await api.get<PersonalRecord[]>(`/api/profiles/${profileId}/personal-records`)
      setRecords(response.data)
    } catch (err: any) {
      console.error('Failed to load personal records:', err)
      setError(err?.message || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleAddRecord = () => {
    setEditingRecord(null)
    setFormData({
      exercise: '',
      weight: 0,
      reps: 1,
      date: new Date().toISOString().split('T')[0]
    })
    onOpen()
  }

  const handleEditRecord = (record: PersonalRecord) => {
    setEditingRecord(record)
    setFormData({
      exercise: record.exercise,
      weight: record.weight,
      reps: record.reps,
      date: record.date.split('T')[0]
    })
    onOpen()
  }

  const handleSaveRecord = async () => {
    if (formData.weight <= 0 || formData.reps <= 0 || !formData.exercise) {
      setError('Заполните все поля корректно')
      return
    }

    try {
      if (editingRecord) {
        // Обновляем существующую запись
        await api.put(`/api/profiles/${profileId}/personal-records/${editingRecord.id}`, formData)
      } else {
        // Создаем новую запись
        await api.post(`/api/profiles/${profileId}/personal-records`, formData)
      }
      
      await loadPersonalRecords()
      onClose()
    } catch (err: any) {
      console.error('Failed to save personal record:', err)
      setError(err?.response?.data?.error || 'Ошибка сохранения')
    }
  }

  const handleDeleteRecord = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот рекорд?')) {
      return
    }

    try {
      await api.delete(`/api/profiles/${profileId}/personal-records/${id}`)
      await loadPersonalRecords()
    } catch (err: any) {
      console.error('Failed to delete personal record:', err)
      setError(err?.message || 'Ошибка удаления')
    }
  }

  // Группируем рекорды по упражнениям
  const recordsByExercise = records.reduce((acc, record) => {
    if (!acc[record.exercise]) {
      acc[record.exercise] = []
    }
    acc[record.exercise].push(record)
    return acc
  }, {} as Record<string, PersonalRecord[]>)

  // Сортируем рекорды по дате (новые сначала)
  Object.keys(recordsByExercise).forEach(exercise => {
    recordsByExercise[exercise].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Загружаем рекорды...</p>
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
            Личные рекорды
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Отслеживайте ваши достижения и прогресс в упражнениях
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
          onPress={handleAddRecord}
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить рекорд
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

      {/* Records by Exercise */}
      {Object.keys(recordsByExercise).length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Пока нет личных рекордов. Добавьте первый рекорд, чтобы начать отслеживание достижений.
          </p>
          <Button
            className="bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold"
            onPress={handleAddRecord}
          >
            Добавить первый рекорд
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(recordsByExercise).map(([exercise, exerciseRecords]) => (
            <div
              key={exercise}
              className="glass shadow-2xl p-6 rounded-2xl border border-white/30 dark:border-slate-700/30"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {exercise}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {exerciseRecords.length} рекорд{exerciseRecords.length === 1 ? '' : exerciseRecords.length < 5 ? 'а' : 'ов'}
                  </span>
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                </div>
              </div>
              
              <div className="space-y-3">
                {exerciseRecords.map((record, index) => (
                  <div
                    key={record.id}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 ${
                      index === 0 
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-2 border-amber-200 dark:border-amber-800' 
                        : 'bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600' 
                          : 'bg-gradient-to-br from-slate-500 to-slate-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            {record.weight} кг × {record.reps} раз
                          </p>
                          {index === 0 && (
                            <span className="px-2 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-200 dark:bg-amber-800 rounded-full">
                              ЛУЧШИЙ
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(record.date).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="light"
                        className="text-blue-600 dark:text-blue-400"
                        onPress={() => handleEditRecord(record)}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        className="text-red-600 dark:text-red-400"
                        onPress={() => handleDeleteRecord(record.id)}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        placement="center"
        backdrop="blur"
        classNames={{
          backdrop: "bg-slate-900/50 backdrop-blur-sm",
          wrapper: "z-[9999]",
          base: "bg-white dark:bg-slate-900",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-200/50 dark:shadow-amber-900/50">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {editingRecord ? 'Редактировать рекорд' : 'Добавить рекорд'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                    Зафиксируйте ваше достижение
                  </p>
                </div>
              </ModalHeader>

              <ModalBody className="pt-6 space-y-4">
                <div>
                  <label className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                    Упражнение
                  </label>
                  <select
                    value={formData.exercise}
                    onChange={(e) => setFormData({ ...formData, exercise: e.target.value })}
                    className="w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-4 focus:ring-amber-100 dark:focus:ring-amber-900/30 transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <option value="">Выберите упражнение</option>
                    {exercises.map((exercise) => (
                      <option key={exercise} value={exercise}>
                        {exercise}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                      className="w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-4 focus:ring-amber-100 dark:focus:ring-amber-900/30 transition-all duration-300 shadow-sm hover:shadow-md"
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                      Повторения
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.reps || ''}
                      onChange={(e) => setFormData({ ...formData, reps: parseInt(e.target.value) || 1 })}
                      className="w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-4 focus:ring-amber-100 dark:focus:ring-amber-900/30 transition-all duration-300 shadow-sm hover:shadow-md"
                      placeholder="5"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                    Дата
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-4 focus:ring-amber-100 dark:focus:ring-amber-900/30 transition-all duration-300 shadow-sm hover:shadow-md"
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
                  onPress={handleSaveRecord}
                  isDisabled={formData.weight <= 0 || formData.reps <= 0 || !formData.exercise}
                  className="h-11 px-8 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                >
                  {editingRecord ? 'Сохранить' : 'Добавить'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
