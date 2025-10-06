"use client"
import React, { useState } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react'
import axios from 'axios'

type Props = {
  isOpen: boolean
  onClose: () => void
  onApply: (values: { reps: number; kg: number }[], applyToAllWeeks: boolean, targetWeek?: number) => void
  visibleWeeks?: number
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
})

type OneRMResponse = {
  oneRM: number
  targetWeight: number
  percentage: number
  formula: string
  sets: { reps: number; kg: number }[]
}

export default function OneRMCalculator({ isOpen, onClose, onApply, visibleWeeks = 4 }: Props) {
  const [inputWeight, setInputWeight] = useState<string>('')
  const [inputReps, setInputReps] = useState<string>('')
  const [selectedPercentage, setSelectedPercentage] = useState<number>(80)
  const [selectedFormula, setSelectedFormula] = useState<string>('brzycki')
  const [calculatedData, setCalculatedData] = useState<OneRMResponse | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [applyToAllWeeks, setApplyToAllWeeks] = useState<boolean>(true)
  const [targetWeek, setTargetWeek] = useState<number>(1)

  // Расчет через API
  const calculateFromAPI = async () => {
    if (!inputWeight || !inputReps) return

    setIsCalculating(true)
    try {
      const response = await api.post<OneRMResponse>('/api/calculate-1rm', {
        weight: Number(inputWeight),
        reps: Number(inputReps),
        percentage: selectedPercentage,
        formula: selectedFormula,
      })
      setCalculatedData(response.data)
    } catch (error) {
      console.error('Failed to calculate 1RM:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  // Пересчитываем при изменении входных данных
  React.useEffect(() => {
    if (inputWeight && inputReps) {
      calculateFromAPI()
    } else {
      setCalculatedData(null)
    }
  }, [inputWeight, inputReps, selectedPercentage, selectedFormula])

  const oneRM = calculatedData?.oneRM || 0

  // Предустановленные проценты для разных целей тренировки
  const presetPercentages = [
    { label: 'Сила (90-100%)', value: 95, reps: 3 },
    { label: 'Мощность (85-90%)', value: 87, reps: 5 },
    { label: 'Гипертрофия (75-85%)', value: 80, reps: 8 },
    { label: 'Выносливость (65-75%)', value: 70, reps: 12 },
  ]

  const handleApply = () => {
    if (!calculatedData) return

    // Используем данные из API с настройками применения
    onApply(calculatedData.sets, applyToAllWeeks, applyToAllWeeks ? undefined : targetWeek)
    onClose()
    
    // Сброс
    setInputWeight('')
    setInputReps('')
    setSelectedPercentage(80)
    setCalculatedData(null)
    setApplyToAllWeeks(true)
    setTargetWeek(1)
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
        base: "bg-white dark:bg-slate-900",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Калькулятор 1ПМ</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Рассчитайте повторный максимум и заполните таблицу</p>
              </div>
            </ModalHeader>

            <ModalBody className="pt-6">
              <div className="space-y-6">
                {/* Ввод данных */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950 border border-indigo-100 dark:border-indigo-800">
                  <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Введите ваши текущие показатели
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                        Вес (кг)
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="w-full h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
                        value={inputWeight}
                        onChange={(e) => setInputWeight(e.target.value)}
                        placeholder="Например: 100"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                        Повторений
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="w-full h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
                        value={inputReps}
                        onChange={(e) => setInputReps(e.target.value)}
                        placeholder="Например: 8"
                      />
                    </div>
                  </div>
                  
                  {/* Выбор формулы расчета */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Формула расчета
                    </label>
                    <select
                      value={selectedFormula}
                      onChange={(e) => setSelectedFormula(e.target.value)}
                      className="w-full h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
                    >
                      <option value="brzycki">Brzycki (рекомендуется)</option>
                      <option value="epley">Epley</option>
                      <option value="lander">Lander</option>
                    </select>
                  </div>
                </div>

                {/* Результат 1ПМ */}
                {oneRM > 0 && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
                    <div className="text-center">
                      <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                        Ваш повторный максимум (1ПМ) {isCalculating && '⏳'}
                      </div>
                      <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{Math.round(oneRM)} <span className="text-xl">кг</span></div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">Формула: {selectedFormula}</div>
                    </div>
                  </div>
                )}

                {/* Выбор процента */}
                {oneRM > 0 && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      Выберите интенсивность тренировки
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {presetPercentages.map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => setSelectedPercentage(preset.value)}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            selectedPercentage === preset.value
                              ? 'border-indigo-500 dark:border-indigo-400 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950 shadow-lg'
                              : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                          }`}
                        >
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-0.5">{preset.label}</div>
                          <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                            {selectedPercentage === preset.value && calculatedData 
                              ? Math.round(calculatedData.targetWeight) 
                              : Math.round(oneRM * preset.value / 100)} кг
                          </div>
                          <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                            {preset.reps} повторений
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Кастомный процент */}
                    <div className="pt-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                        Или укажите свой процент: {selectedPercentage}%
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        step="5"
                        value={selectedPercentage}
                        onChange={(e) => setSelectedPercentage(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <div className="mt-2 text-center">
                        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                          {calculatedData ? Math.round(calculatedData.targetWeight) : Math.round(oneRM * selectedPercentage / 100)} кг
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Выбор: применить ко всем неделям или к одной */}
                {oneRM > 0 && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 block flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Применить к
                    </label>
                    <div className="space-y-2">
                      <button
                        onClick={() => setApplyToAllWeeks(true)}
                        className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                          applyToAllWeeks
                            ? 'border-indigo-500 dark:border-indigo-400 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950 shadow-lg'
                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            applyToAllWeeks ? 'border-indigo-500 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {applyToAllWeeks && <div className="w-3 h-3 rounded-full bg-indigo-500 dark:bg-indigo-400"></div>}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Всем неделям</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">Применить к упражнению во всех {visibleWeeks} неделях</div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setApplyToAllWeeks(false)}
                        className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                          !applyToAllWeeks
                            ? 'border-indigo-500 dark:border-indigo-400 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950 shadow-lg'
                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            !applyToAllWeeks ? 'border-indigo-500 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {!applyToAllWeeks && <div className="w-3 h-3 rounded-full bg-indigo-500 dark:bg-indigo-400"></div>}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Одной неделе</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">Применить только к выбранной неделе</div>
                            {!applyToAllWeeks && (
                              <select
                                value={targetWeek}
                                onChange={(e) => setTargetWeek(Number(e.target.value))}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full h-9 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-all"
                              >
                                {Array.from({ length: visibleWeeks }, (_, i) => i + 1).map((week) => (
                                  <option key={week} value={week}>Неделя {week}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
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
                onPress={handleApply}
                isDisabled={!oneRM}
                className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-bold shadow-lg hover:shadow-xl transition-all"
              >
                Применить к таблице
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}

