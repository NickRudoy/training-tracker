"use client"
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import TrainingTable, { Training } from '../components/TrainingTable'
import { Exercise } from '../components/ExerciseSelector'
import { Button } from '@heroui/react'

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080' })

export default function HomePage() {
  const [rows, setRows] = useState<Training[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleWeeks, setVisibleWeeks] = useState<number>(1)

  async function fetchRows() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<Training[]>('/api/trainings')
      setRows(res.data)
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function fetchExercises() {
    try {
      const res = await api.get<Exercise[]>('/api/exercises')
      setExercises(res.data)
    } catch (e: any) {
      console.error('Failed to load exercises:', e)
    }
  }

  useEffect(() => {
    fetchRows()
    fetchExercises()
  }, [])

  function updateCell(index: number, key: keyof Training, value: string) {
    const next = [...rows]
    if (key === 'exercise') {
      next[index].exercise = value
    } else {
      const num = parseInt(value || '0', 10)
      next[index][key] = Number.isNaN(num) ? 0 : num
    }
    setRows(next)
  }

  async function saveRow(index: number) {
    const row = rows[index]
    const payload = { ...row, weeks: visibleWeeks }
    if (row.id) {
      await api.put(`/api/trainings/${row.id}`, payload)
    } else {
      const res = await api.post('/api/trainings', payload)
      const next = [...rows]
      next[index] = res.data
      setRows(next)
    }
  }

  async function deleteRow(index: number) {
    const row = rows[index]
    if (row.id) {
      await api.delete(`/api/trainings/${row.id}`)
    }
    setRows(rows.filter((_, i) => i !== index))
  }

  function addRow() {
    setRows([
      ...rows,
      {
        exercise: '',
        week1d1Reps: 0, week1d1Kg: 0, week1d2Reps: 0, week1d2Kg: 0, week1d3Reps: 0, week1d3Kg: 0, week1d4Reps: 0, week1d4Kg: 0, week1d5Reps: 0, week1d5Kg: 0, week1d6Reps: 0, week1d6Kg: 0,
        week2d1Reps: 0, week2d1Kg: 0, week2d2Reps: 0, week2d2Kg: 0, week2d3Reps: 0, week2d3Kg: 0, week2d4Reps: 0, week2d4Kg: 0, week2d5Reps: 0, week2d5Kg: 0, week2d6Reps: 0, week2d6Kg: 0,
        week3d1Reps: 0, week3d1Kg: 0, week3d2Reps: 0, week3d2Kg: 0, week3d3Reps: 0, week3d3Kg: 0, week3d4Reps: 0, week3d4Kg: 0, week3d5Reps: 0, week3d5Kg: 0, week3d6Reps: 0, week3d6Kg: 0,
        week4d1Reps: 0, week4d1Kg: 0, week4d2Reps: 0, week4d2Kg: 0, week4d3Reps: 0, week4d3Kg: 0, week4d4Reps: 0, week4d4Kg: 0, week4d5Reps: 0, week4d5Kg: 0, week4d6Reps: 0, week4d6Kg: 0,
      },
    ])
  }

  async function addCustomExercise(exercise: Omit<Exercise, 'id' | 'isCustom'>) {
    try {
      const res = await api.post<Exercise>('/api/exercises', exercise)
      setExercises([...exercises, res.data])
    } catch (e: any) {
      console.error('Failed to add custom exercise:', e)
      throw e
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="rounded-2xl glass shadow-xl p-6 border-2 border-white/60 dark:border-slate-700/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/50">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">Планирование тренировок</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Фиксируйте подходы и веса по неделям с полным контролем</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Недель:</span>
              <Button 
                variant="light" 
                size="sm"
                className="h-7 w-7 min-w-0 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                onPress={() => setVisibleWeeks(Math.max(1, visibleWeeks - 1))}
                isDisabled={visibleWeeks <= 1}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </Button>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 min-w-[24px] text-center">{visibleWeeks}</span>
              <Button 
                variant="light" 
                size="sm"
                className="h-7 w-7 min-w-0 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                onPress={() => setVisibleWeeks(Math.min(8, visibleWeeks + 1))}
                isDisabled={visibleWeeks >= 8}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Button>
            </div>
            <Button 
              className="h-9 rounded-xl px-5 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 hover:shadow-xl hover:shadow-indigo-300/60 dark:hover:shadow-indigo-800/60 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              onPress={addRow}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Новая запись
            </Button>
            <Button 
              variant="bordered"
              className="h-9 rounded-xl px-4 text-xs font-semibold border-2 hover:bg-slate-50 dark:hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              onPress={fetchRows}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Обновить
            </Button>
          </div>
        </div>
        {(loading || error) && (
          <div className="mt-4 flex items-center gap-3">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Загрузка данных...</span>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-red-700 dark:text-red-300">{error}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <TrainingTable
        data={rows}
        exercises={exercises}
        onChangeCell={updateCell}
        onSaveRow={saveRow}
        onDeleteRow={async (i) => deleteRow(i)}
        onAddRow={addRow}
        onAddCustomExercise={addCustomExercise}
        visibleWeeks={visibleWeeks}
      />
    </div>
  )
}

