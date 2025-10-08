"use client"
import React, { useState, useMemo, useEffect } from 'react'
import { Button } from '@heroui/react'
import axios from 'axios'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts'

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080' })

type Training = {
  id?: number
  profileId: number
  exercise: string
  week1d1Reps: number; week1d1Kg: number; week1d2Reps: number; week1d2Kg: number; week1d3Reps: number; week1d3Kg: number; week1d4Reps: number; week1d4Kg: number; week1d5Reps: number; week1d5Kg: number; week1d6Reps: number; week1d6Kg: number;
  week2d1Reps: number; week2d1Kg: number; week2d2Reps: number; week2d2Kg: number; week2d3Reps: number; week2d3Kg: number; week2d4Reps: number; week2d4Kg: number; week2d5Reps: number; week2d5Kg: number; week2d6Reps: number; week2d6Kg: number;
  week3d1Reps: number; week3d1Kg: number; week3d2Reps: number; week3d2Kg: number; week3d3Reps: number; week3d3Kg: number; week3d4Reps: number; week3d4Kg: number; week3d5Reps: number; week3d5Kg: number; week3d6Reps: number; week3d6Kg: number;
  week4d1Reps: number; week4d1Kg: number; week4d2Reps: number; week4d2Kg: number; week4d3Reps: number; week4d3Kg: number; week4d4Reps: number; week4d4Kg: number; week4d5Reps: number; week4d5Kg: number; week4d6Reps: number; week4d6Kg: number;
}

type ChartData = {
  week: string
  [key: string]: string | number
}

type ChartDataPoint = {
  week: string
  exerciseData: { [key: string]: number }
}

type ProgressChartsResponse = {
  chartData: ChartDataPoint[]
  exercises: string[]
  period: string
  chartType: string
}

type Props = {
  profileId: number
  selectedExercises: string[]
  onExerciseToggle: (exercise: string) => void
  period: 'week' | 'month' | 'year' | 'all'
  onPeriodChange: (period: 'week' | 'month' | 'year' | 'all') => void
}

const COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
  '#84CC16', // lime-500
]

export default function ProgressCharts({ 
  profileId,
  selectedExercises, 
  onExerciseToggle, 
  period, 
  onPeriodChange 
}: Props) {
  const [chartType, setChartType] = useState<'weight' | 'volume' | 'intensity'>('weight')
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [allExercises, setAllExercises] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загружаем данные с бэкенда
  useEffect(() => {
    const loadChartData = async () => {
      if (!profileId) return
      
      setLoading(true)
      setError(null)
      
      try {
        const params = new URLSearchParams({
          type: chartType,
          period: period,
        })
        
        // Добавляем выбранные упражнения в параметры
        selectedExercises.forEach(exercise => {
          params.append('exercises', exercise)
        })
        
        const response = await api.get<ProgressChartsResponse>(
          `/api/profiles/${profileId}/progress-charts?${params.toString()}`
        )
        
        // Преобразуем данные в формат для Recharts
        const formattedData: ChartData[] = response.data.chartData.map(point => ({
          week: point.week,
          ...point.exerciseData
        }))
        
        setChartData(formattedData)
        setAllExercises(response.data.exercises)
      } catch (err: any) {
        console.error('Failed to load chart data:', err)
        setError(err?.message || 'Ошибка загрузки данных')
      } finally {
        setLoading(false)
      }
    }

    loadChartData()
  }, [profileId, chartType, period, selectedExercises])

  // Загружаем список упражнений при монтировании компонента
  useEffect(() => {
    const loadExercises = async () => {
      if (!profileId) return
      
      try {
        const response = await api.get<{ exercises: string[] }>(`/api/profiles/${profileId}/exercises`)
        setAllExercises(response.data.exercises)
      } catch (err) {
        console.error('Failed to load exercises:', err)
      }
    }

    loadExercises()
  }, [profileId])

  // Кастомный тултип
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
          <p className="font-bold text-slate-900 dark:text-slate-100 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {entry.dataKey}:
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {chartType === 'intensity' 
                  ? `${entry.value.toFixed(1)}%` 
                  : chartType === 'volume'
                  ? `${(entry.value / 1000).toFixed(1)}т`
                  : `${entry.value}кг`
                }
              </span>
            </div>
          ))}
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
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Загружаем данные графиков...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900 dark:to-orange-900 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Ошибка загрузки</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <Button 
            className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold"
            onPress={() => window.location.reload()}
          >
            Попробовать снова
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Chart Type Selector */}
        <div className="flex gap-2">
          {[
            { key: 'weight', label: 'Веса', icon: '🏋️' },
            { key: 'volume', label: 'Объем', icon: '📊' },
            { key: 'intensity', label: 'Интенсивность', icon: '⚡' }
          ].map(({ key, label, icon }) => (
            <Button
              key={key}
              size="sm"
              variant={chartType === key ? 'solid' : 'bordered'}
              className={`h-10 px-4 rounded-xl font-bold transition-all duration-300 ${
                chartType === key
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg'
                  : 'border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500'
              }`}
              onPress={() => setChartType(key as any)}
            >
              <span className="mr-2">{icon}</span>
              {label}
            </Button>
          ))}
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {[
            { key: 'week', label: 'Неделя' },
            { key: 'month', label: 'Месяц' },
            { key: 'year', label: 'Год' },
            { key: 'all', label: 'Все время' }
          ].map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={period === key ? 'solid' : 'bordered'}
              className={`h-10 px-4 rounded-xl font-bold transition-all duration-300 ${
                period === key
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg'
                  : 'border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-sky-400 dark:hover:border-sky-500'
              }`}
              onPress={() => onPeriodChange(key as any)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Exercise Selector */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Выберите упражнения для сравнения:
        </h3>
        <div className="flex flex-wrap gap-2">
          {allExercises.map((exercise, index) => (
            <Button
              key={exercise}
              size="sm"
              variant={selectedExercises.includes(exercise) ? 'solid' : 'bordered'}
              className={`h-9 px-4 rounded-xl font-semibold transition-all duration-300 ${
                selectedExercises.includes(exercise)
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg'
                  : 'border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-emerald-400 dark:hover:border-emerald-500'
              }`}
              onPress={() => onExerciseToggle(exercise)}
            >
              {exercise}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="glass shadow-2xl p-6 rounded-2xl border border-white/30 dark:border-slate-700/30">
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'intensity' ? (
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis 
                  dataKey="week" 
                  stroke="#64748B"
                  fontSize={12}
                  fontWeight={600}
                />
                <YAxis 
                  stroke="#64748B"
                  fontSize={12}
                  fontWeight={600}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {selectedExercises.map((exercise, index) => (
                  <Area
                    key={exercise}
                    type="monotone"
                    dataKey={exercise}
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.3}
                    strokeWidth={3}
                  />
                ))}
              </AreaChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis 
                  dataKey="week" 
                  stroke="#64748B"
                  fontSize={12}
                  fontWeight={600}
                />
                <YAxis 
                  stroke="#64748B"
                  fontSize={12}
                  fontWeight={600}
                  tickFormatter={(value) => 
                    chartType === 'volume' ? `${(value / 1000).toFixed(1)}т` : `${value}кг`
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {selectedExercises.map((exercise, index) => (
                  <Line
                    key={exercise}
                    type="monotone"
                    dataKey={exercise}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={3}
                    dot={{ r: 6, strokeWidth: 2, fill: COLORS[index % COLORS.length] }}
                    activeDot={{ r: 8, strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart Info */}
      <div className="text-center text-sm text-slate-600 dark:text-slate-400">
        {chartType === 'weight' && (
          <p>📈 Показывает максимальный вес в каждом подходе по неделям</p>
        )}
        {chartType === 'volume' && (
          <p>📊 Показывает общий объем нагрузки (вес × повторы) по неделям</p>
        )}
        {chartType === 'intensity' && (
          <p>⚡ Показывает интенсивность тренировок (средний вес / максимальный вес × 100%)</p>
        )}
      </div>
    </div>
  )
}
