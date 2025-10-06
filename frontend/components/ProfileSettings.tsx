"use client"
import React, { useState, useEffect } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react'

export type Profile = {
  id: number
  name: string
  age?: number
  gender?: string
  weight?: number
  height?: number
  goal?: string
  experience?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  profile: Profile | null
  onSave: (profile: Partial<Profile>) => Promise<void>
}

export default function ProfileSettings({ isOpen, onClose, profile, onSave }: Props) {
  const [formData, setFormData] = useState<Partial<Profile>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [bmi, setBmi] = useState<number | null>(null)

  useEffect(() => {
    if (profile) {
      setFormData({
        age: profile.age,
        gender: profile.gender || '',
        weight: profile.weight,
        height: profile.height,
        goal: profile.goal || '',
        experience: profile.experience || '',
        notes: profile.notes || '',
      })
    }
  }, [profile])

  useEffect(() => {
    if (formData.weight && formData.height && formData.height > 0) {
      const heightM = formData.height / 100
      const calculatedBmi = formData.weight / (heightM * heightM)
      setBmi(calculatedBmi)
    } else {
      setBmi(null)
    }
  }, [formData.weight, formData.height])

  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return { text: 'Недостаточный вес', color: 'text-blue-600 dark:text-blue-400' }
    if (bmi < 25) return { text: 'Нормальный вес', color: 'text-green-600 dark:text-green-400' }
    if (bmi < 30) return { text: 'Избыточный вес', color: 'text-orange-600 dark:text-orange-400' }
    return { text: 'Ожирение', color: 'text-red-600 dark:text-red-400' }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="2xl"
      placement="center"
      backdrop="blur"
      scrollBehavior="inside"
      classNames={{
        backdrop: "bg-slate-900/50 backdrop-blur-sm",
        wrapper: "z-[9999]",
        base: "bg-white dark:bg-slate-900 max-h-[90vh]",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Настройки профиля</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Укажите параметры для персональных рекомендаций</p>
              </div>
            </ModalHeader>

            <ModalBody className="pt-6 pb-6 space-y-6">
              {/* Физические параметры */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Физические параметры
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Возраст */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                      Возраст
                    </label>
                    <input
                      type="number"
                      value={formData.age || ''}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Например: 25"
                      className="w-full h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
                    />
                  </div>

                  {/* Пол */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                      Пол
                    </label>
                    <select
                      value={formData.gender || ''}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all cursor-pointer"
                    >
                      <option value="">Не указан</option>
                      <option value="male">Мужской</option>
                      <option value="female">Женский</option>
                      <option value="other">Другой</option>
                    </select>
                  </div>

                  {/* Вес */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                      Вес (кг)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.weight || ''}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Например: 75.5"
                      className="w-full h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
                    />
                  </div>

                  {/* Рост */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                      Рост (см)
                    </label>
                    <input
                      type="number"
                      value={formData.height || ''}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Например: 180"
                      className="w-full h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
                    />
                  </div>
                </div>

                {/* BMI */}
                {bmi && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950 border-2 border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Индекс массы тела (BMI):</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{bmi.toFixed(1)}</span>
                        <p className={`text-sm font-semibold mt-1 ${getBmiCategory(bmi).color}`}>
                          {getBmiCategory(bmi).text}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Цели и опыт */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  Цели и опыт
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Цель */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                      Основная цель
                    </label>
                    <select
                      value={formData.goal || ''}
                      onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                      className="w-full h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all cursor-pointer"
                    >
                      <option value="">Не указана</option>
                      <option value="strength">💪 Развитие силы</option>
                      <option value="mass">🏋️ Набор массы</option>
                      <option value="endurance">🏃 Выносливость</option>
                      <option value="weight_loss">🔥 Похудение</option>
                    </select>
                  </div>

                  {/* Опыт */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                      Уровень опыта
                    </label>
                    <select
                      value={formData.experience || ''}
                      onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                      className="w-full h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all cursor-pointer"
                    >
                      <option value="">Не указан</option>
                      <option value="beginner">🌱 Начинающий</option>
                      <option value="intermediate">💪 Средний</option>
                      <option value="advanced">🏆 Продвинутый</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Заметки */}
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Заметки
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Дополнительная информация: травмы, ограничения, особенности..."
                  rows={4}
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all resize-none"
                />
              </div>
            </ModalBody>

            <ModalFooter className="border-t border-slate-200 dark:border-slate-700">
              <Button
                variant="light"
                onPress={onClose}
                className="font-semibold"
              >
                Отмена
              </Button>
              <Button
                onPress={handleSave}
                isDisabled={isSaving}
                isLoading={isSaving}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-lg hover:shadow-xl transition-all"
              >
                Сохранить
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}

