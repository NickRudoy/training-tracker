"use client"
import React from 'react'
import { Button } from '@heroui/react'
import ExerciseSelector, { Exercise } from './ExerciseSelector'
import NumberSelector from './NumberSelector'
import { Training } from './TrainingTable'

type Props = {
  training: Training
  exercises: Exercise[]
  weekFilter: number
  visibleWeeks: number
  onDelete: () => void
  onOpen1RM: () => void
  onAddCustomExercise: (exercise: Omit<Exercise, 'id' | 'isCustom'>) => Promise<void>
  onChangeCell: (key: keyof Training, value: string) => void
}

export default function MobileTrainingCard({
  training,
  exercises,
  weekFilter,
  visibleWeeks,
  onDelete,
  onOpen1RM,
  onAddCustomExercise,
  onChangeCell,
}: Props) {
  const weeksToShow = weekFilter > 0 ? [weekFilter] : Array.from({ length: visibleWeeks }, (_, i) => i + 1)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-slate-200 dark:border-slate-700 overflow-hidden animate-fadeIn">
      {/* Header карточки с упражнением */}
      <div className="bg-gradient-to-r from-indigo-500 to-violet-600 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <ExerciseSelector
              value={training.exercise || ''}
              exercises={exercises}
              onChange={(val) => onChangeCell('exercise', val)}
              onAddCustomExercise={onAddCustomExercise}
              className="w-full px-4 py-3 text-base font-bold rounded-xl bg-white/20 backdrop-blur-sm text-white placeholder:text-white/60 border-2 border-white/30 focus:border-white focus:bg-white/30 focus:outline-none transition-all shadow-lg"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onPress={onOpen1RM}
              className="h-10 w-10 min-w-0 p-0 rounded-xl bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/30 transition-all shadow-lg"
              title="Калькулятор 1ПМ"
            >
              <span className="text-sm font-bold">1ПМ</span>
            </Button>
            <Button
              size="sm"
              onPress={onDelete}
              className="h-10 w-10 min-w-0 p-0 rounded-xl bg-red-500/20 backdrop-blur-sm border-2 border-red-400/30 text-white hover:bg-red-500/30 transition-all shadow-lg"
              title="Удалить"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Недели */}
      {weeksToShow.map((weekNum) => (
        <div key={weekNum} className="p-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">Неделя {weekNum}</span>
            </div>
          </div>

          {/* Подходы в виде сетки 2x3 */}
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((dayNum) => {
              const repsKey = `week${weekNum}d${dayNum}Reps` as keyof Training
              const kgKey = `week${weekNum}d${dayNum}Kg` as keyof Training

              return (
                <div 
                  key={dayNum} 
                  className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-1 mb-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                      {dayNum}
                    </span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Подход</span>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Повторы */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                        Повторы
                      </label>
                      <NumberSelector
                        value={(training as any)[repsKey] || ''}
                        onChange={(val) => onChangeCell(repsKey, val)}
                        type="reps"
                        min={1}
                        max={100}
                        className="w-full h-11 px-3 text-center text-base font-bold rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 focus:outline-none transition-all"
                      />
                    </div>

                    {/* Вес */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                        Вес, кг
                      </label>
                      <NumberSelector
                        value={(training as any)[kgKey] || ''}
                        onChange={(val) => onChangeCell(kgKey, val)}
                        type="weight"
                        min={1}
                        max={500}
                        className="w-full h-11 px-3 text-center text-base font-bold rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

