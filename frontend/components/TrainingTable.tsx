"use client"
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, useDisclosure } from '@heroui/react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import ExerciseSelector, { Exercise } from './ExerciseSelector'
import NumberSelector from './NumberSelector'
import OneRMCalculator from './OneRMCalculator'
import MobileTrainingCard from './MobileTrainingCard'

export type Training = {
  id?: number
  profileId: number
  exercise: string
  week1d1Reps: number; week1d1Kg: number; week1d2Reps: number; week1d2Kg: number; week1d3Reps: number; week1d3Kg: number; week1d4Reps: number; week1d4Kg: number; week1d5Reps: number; week1d5Kg: number; week1d6Reps: number; week1d6Kg: number;
  week2d1Reps: number; week2d1Kg: number; week2d2Reps: number; week2d2Kg: number; week2d3Reps: number; week2d3Kg: number; week2d4Reps: number; week2d4Kg: number; week2d5Reps: number; week2d5Kg: number; week2d6Reps: number; week2d6Kg: number;
  week3d1Reps: number; week3d1Kg: number; week3d2Reps: number; week3d2Kg: number; week3d3Reps: number; week3d3Kg: number; week3d4Reps: number; week3d4Kg: number; week3d5Reps: number; week3d5Kg: number; week3d6Reps: number; week3d6Kg: number;
  week4d1Reps: number; week4d1Kg: number; week4d2Reps: number; week4d2Kg: number; week4d3Reps: number; week4d3Kg: number; week4d4Reps: number; week4d4Kg: number; week4d5Reps: number; week4d5Kg: number; week4d6Reps: number; week4d6Kg: number;
}

type Props = {
  data: Training[]
  exercises: Exercise[]
  onChangeCell: (rowIndex: number, key: keyof Training, value: string) => void
  onSaveRow: (rowIndex: number) => Promise<void>
  onDeleteRow: (rowIndex: number) => Promise<void>
  onAddRow?: () => void
  onAddCustomExercise: (exercise: Omit<Exercise, 'id' | 'isCustom'>) => Promise<void>
  visibleWeeks?: number
}

export default function TrainingTable({ data, exercises, onChangeCell, onSaveRow, onDeleteRow, onAddRow, onAddCustomExercise, visibleWeeks = 4 }: Props) {
  const [filter, setFilter] = useState<string>("")
  const [weekFilter, setWeekFilter] = useState<number>(0) // 0 = все недели, 1-8 = конкретная неделя
  const [isMobileView, setIsMobileView] = useState(false)
  // Локальное состояние для редактирования - сохраняет только активно редактируемые ячейки
  const [editingCells, setEditingCells] = useState<Record<string, string>>({})
  // Состояния для калькулятора 1RM
  const { isOpen: is1RMOpen, onOpen: on1RMOpen, onClose: on1RMClose } = useDisclosure()
  const [selected1RMRow, setSelected1RMRow] = useState<number | null>(null)
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  const flatKeys = ['exercise',
    'week1d1Reps','week1d1Kg','week1d2Reps','week1d2Kg','week1d3Reps','week1d3Kg','week1d4Reps','week1d4Kg','week1d5Reps','week1d5Kg','week1d6Reps','week1d6Kg',
    'week2d1Reps','week2d1Kg','week2d2Reps','week2d2Kg','week2d3Reps','week2d3Kg','week2d4Reps','week2d4Kg','week2d5Reps','week2d5Kg','week2d6Reps','week2d6Kg',
    'week3d1Reps','week3d1Kg','week3d2Reps','week3d2Kg','week3d3Reps','week3d3Kg','week3d4Reps','week3d4Kg','week3d5Reps','week3d5Kg','week3d6Reps','week3d6Kg',
    'week4d1Reps','week4d1Kg','week4d2Reps','week4d2Kg','week4d3Reps','week4d3Kg','week4d4Reps','week4d4Kg','week4d5Reps','week4d5Kg','week4d6Reps','week4d6Kg',
  ] as const
  const numCols = flatKeys.length

  // Matrix of refs for focus navigation
  const cellRefs = useRef<HTMLInputElement[][]>([])
  useEffect(() => {
    // Ensure refs matrix matches data size
    cellRefs.current = data.map((_, rIdx) => {
      const existing = cellRefs.current[rIdx] || []
      return flatKeys.map((_, cIdx) => existing[cIdx] || null).map((v) => v!)
    })
  }, [data])

  function focusCell(r: number, c: number) {
    const row = cellRefs.current[r]
    const el = row?.[c]
    if (el) {
      el.focus()
      el.select()
    }
  }

  // Helper для работы с локальным состоянием редактирования
  const getCellKey = (rowIndex: number, key: string) => `${rowIndex}-${key}`
  
  const getCellValue = (rowIndex: number, key: keyof Training) => {
    const cellKey = getCellKey(rowIndex, key)
    // Если ячейка редактируется, возвращаем локальное значение
    if (cellKey in editingCells) {
      return editingCells[cellKey]
    }
    // Иначе возвращаем значение из data
    const value = (data[rowIndex] as any)[key]
    // Для чисел: 0 это валидное значение, показываем пустую строку только для null/undefined
    if (value === null || value === undefined) return ''
    return String(value)
  }

  const handleCellChange = (rowIndex: number, key: keyof Training, value: string) => {
    const cellKey = getCellKey(rowIndex, key)
    setEditingCells(prev => ({ ...prev, [cellKey]: value }))
  }

  const commitCellChange = (rowIndex: number, key: keyof Training) => {
    const cellKey = getCellKey(rowIndex, key)
    if (cellKey in editingCells) {
      onChangeCell(rowIndex, key, editingCells[cellKey])
      setEditingCells(prev => {
        const next = { ...prev }
        delete next[cellKey]
        return next
      })
    }
  }

  // Автозаполнение (дублирование значений на все подходы недели)
  const handleAutofill = (rowIndex: number, week: number, setIndex: number) => {
    const baseReps = `week${week}d${setIndex}Reps` as keyof Training
    const baseKg = `week${week}d${setIndex}Kg` as keyof Training
    
    const repsValue = (data[rowIndex] as any)[baseReps]
    const kgValue = (data[rowIndex] as any)[baseKg]

    // Копируем на все 6 подходов этой недели
    for (let i = 1; i <= 6; i++) {
      const repsKey = `week${week}d${i}Reps` as keyof Training
      const kgKey = `week${week}d${i}Kg` as keyof Training
      onChangeCell(rowIndex, repsKey, String(repsValue))
      onChangeCell(rowIndex, kgKey, String(kgValue))
    }
  }

  // Применить значения из калькулятора 1RM к упражнению
  const handle1RMApply = (values: { reps: number; kg: number }[], applyToAllWeeks: boolean, targetWeek?: number) => {
    if (selected1RMRow === null) return

    if (applyToAllWeeks) {
      // Применяем ко всем неделям этого упражнения
      for (let week = 1; week <= visibleWeeks; week++) {
        values.forEach((val, idx) => {
          const setIndex = idx + 1
          const repsKey = `week${week}d${setIndex}Reps` as keyof Training
          const kgKey = `week${week}d${setIndex}Kg` as keyof Training
          onChangeCell(selected1RMRow, repsKey, String(val.reps))
          onChangeCell(selected1RMRow, kgKey, String(val.kg))
        })
      }
    } else if (targetWeek) {
      // Применяем только к выбранной неделе
      values.forEach((val, idx) => {
        const setIndex = idx + 1
        const repsKey = `week${targetWeek}d${setIndex}Reps` as keyof Training
        const kgKey = `week${targetWeek}d${setIndex}Kg` as keyof Training
        onChangeCell(selected1RMRow, repsKey, String(val.reps))
        onChangeCell(selected1RMRow, kgKey, String(val.kg))
      })
    }

    setSelected1RMRow(null)
  }

  // Открыть калькулятор 1RM для конкретного упражнения (строки)
  const open1RMCalculator = (rowIndex: number) => {
    setSelected1RMRow(rowIndex)
    on1RMOpen()
  }

  function handleKeyNav(e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number, fieldKey?: keyof Training) {
    const key = e.key
    const isShift = e.shiftKey
    const isCtrl = e.ctrlKey || e.metaKey
    const lastRow = data.length - 1
    const lastCol = numCols - 1

    // Сохраняем изменения перед навигацией
    const commitAndNavigate = (callback: () => void) => {
      if (fieldKey) {
        commitCellChange(rowIndex, fieldKey)
      }
      setTimeout(callback, 0)
    }

    if (isCtrl && key === 'Enter') {
      e.preventDefault()
      commitAndNavigate(() => {
        onAddRow?.()
        setTimeout(() => focusCell(data.length, 0), 0)
      })
      return
    }

    if (key === 'Enter') {
      e.preventDefault()
      const nextRow = isShift ? Math.max(0, rowIndex - 1) : Math.min(lastRow, rowIndex + 1)
      commitAndNavigate(() => focusCell(nextRow, colIndex))
      return
    }

    if (key === 'Tab') {
      e.preventDefault()
      let nextR = rowIndex
      let nextC = isShift ? colIndex - 1 : colIndex + 1
      if (nextC < 0) {
        if (rowIndex > 0) { nextR = rowIndex - 1; nextC = lastCol } else { nextC = 0 }
      } else if (nextC > lastCol) {
        if (rowIndex < lastRow) { nextR = rowIndex + 1; nextC = 0 } else { nextC = lastCol }
      }
      commitAndNavigate(() => focusCell(nextR, nextC))
      return
    }

    if (key === 'ArrowRight') { e.preventDefault(); commitAndNavigate(() => focusCell(rowIndex, Math.min(lastCol, colIndex + 1))); return }
    if (key === 'ArrowLeft')  { e.preventDefault(); commitAndNavigate(() => focusCell(rowIndex, Math.max(0, colIndex - 1))); return }
    if (key === 'ArrowDown')  { e.preventDefault(); commitAndNavigate(() => focusCell(Math.min(lastRow, rowIndex + 1), colIndex)); return }
    if (key === 'ArrowUp')    { e.preventDefault(); commitAndNavigate(() => focusCell(Math.max(0, rowIndex - 1), colIndex)); return }
  }
  const columns = useMemo<ColumnDef<Training>[]>(() => {
    const exerciseCol: ColumnDef<Training> = {
      accessorKey: 'exercise',
      header: () => (
        <div className="text-left sticky left-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950 px-3 py-1.5 ring-2 ring-indigo-100 dark:ring-indigo-800">
            <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Упражнение</span>
          </div>
        </div>
      ),
      cell: ({ row }) => (
        <ExerciseSelector
          exercises={exercises}
          value={row.original.exercise}
          onChange={(value) => onChangeCell(row.index, 'exercise', value)}
          onAddCustomExercise={onAddCustomExercise}
        />
      ),
    }

    // Фильтруем недели на основе выбранного фильтра
    const weeksToShow = weekFilter === 0 
      ? Array.from({ length: visibleWeeks }, (_, i) => i + 1)
      : [weekFilter]
    
    const weekGroups: ColumnDef<Training>[] = weeksToShow.map((week) => {
      const pairs = (['d1','d2','d3','d4','d5','d6'] as const).map((d) => ({ reps: `week${week}${d}Reps`, kg: `week${week}${d}Kg` }))
      const weekColors = [
        'from-blue-50 to-cyan-50 ring-blue-200 text-blue-700',
        'from-emerald-50 to-teal-50 ring-emerald-200 text-emerald-700',
        'from-amber-50 to-orange-50 ring-amber-200 text-amber-700',
        'from-rose-50 to-pink-50 ring-rose-200 text-rose-700',
      ]
      const weekColor = weekColors[(week - 1) % weekColors.length]
      
      return {
        id: `week${week}`,
        header: () => (
          <div className="col-span-6">
            <div className={`mx-2 rounded-lg bg-gradient-to-r ${weekColor} px-3 py-2 text-center ring-2 shadow-sm`}>
              <div className="flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[11px] font-bold uppercase tracking-wider">{`Неделя ${week}`}</span>
              </div>
            </div>
          </div>
        ),
        columns: pairs.map((pair, idx) => {
          const repsKey = pair.reps as keyof Training
          const kgKey = pair.kg as keyof Training
          const repsColIndex = flatKeys.indexOf(repsKey as any)
          const kgColIndex = flatKeys.indexOf(kgKey as any)
          return {
            id: `week${week}-set${idx+1}`,
            header: () => (
              <div className="text-center relative group">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100/80 dark:bg-slate-800/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500"></span>
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">{`${idx+1}`}</span>
                </div>
                <div className="absolute top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 whitespace-nowrap">Подход {idx+1}</span>
                </div>
              </div>
            ),
            cell: ({ row }) => (
              <div className="relative mx-auto h-11 w-40 select-none group">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 opacity-60 group-hover:opacity-100 transition-opacity border border-slate-200/60 dark:border-slate-600/60"></div>
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-9 w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
                
                {/* Кнопка автозаполнения */}
                <button
                  onClick={() => handleAutofill(row.index, week, idx + 1)}
                  className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all px-2 py-1 text-[10px] font-bold rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md hover:shadow-lg z-10"
                  title="Заполнить все подходы этими значениями"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>

                <div className="absolute inset-0 grid grid-cols-2 gap-0">
                  <div className="relative flex items-center justify-center">
                    <NumberSelector
                      type="reps"
                      min={1}
                      max={100}
                      value={getCellValue(row.index, repsKey)}
                      onChange={(val) => handleCellChange(row.index, repsKey, val)}
                      onBlur={() => commitCellChange(row.index, repsKey)}
                      placeholder="0"
                      className="col-span-1 h-full w-full rounded-l-lg border-0 bg-transparent px-2 text-center font-mono text-[15px] font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 focus:ring-offset-0 focus:bg-white/80 dark:focus:bg-slate-700/80 transition-all"
                    />
                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">rep</span>
                  </div>
                  <div className="relative flex items-center justify-center">
                    <NumberSelector
                      type="weight"
                      min={1}
                      max={500}
                      value={getCellValue(row.index, kgKey)}
                      onChange={(val) => handleCellChange(row.index, kgKey, val)}
                      onBlur={() => commitCellChange(row.index, kgKey)}
                      placeholder="0"
                      className="col-span-1 h-full w-full rounded-r-lg border-0 bg-transparent px-2 text-center font-mono text-[15px] font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 focus:ring-offset-0 focus:bg-white/80 dark:focus:bg-slate-700/80 transition-all"
                    />
                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">kg</span>
                  </div>
                </div>
              </div>
            ),
          } as ColumnDef<Training>
        })
      } as ColumnDef<Training>
    })

    const actionsCol: ColumnDef<Training> = {
      id: 'actions',
      header: () => (
        <div className="text-center">
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100/80 dark:bg-slate-800/80">
            <svg className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Действия</span>
          </div>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex gap-2 animate-fadeIn">
          <Button
            size="sm"
            variant="solid"
            className="h-9 rounded-xl px-3 text-xs font-semibold text-white shadow-lg shadow-purple-200/50 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 hover:shadow-xl hover:shadow-purple-300/60 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            onPress={() => open1RMCalculator(row.index)}
            title="Калькулятор 1ПМ для этого упражнения"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            1ПМ
          </Button>
          <Button
            size="sm"
            variant="solid"
            className="h-9 rounded-xl px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-200/50 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:shadow-xl hover:shadow-indigo-300/60 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            onPress={() => onSaveRow(row.index)}
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Сохранить
          </Button>
          <Button
            size="sm"
            variant="bordered"
            className="h-9 rounded-xl px-4 text-xs font-semibold text-red-600 border-2 border-red-200 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            onPress={() => onDeleteRow(row.index)}
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Удалить
          </Button>
        </div>
      ),
    }

    return [exerciseCol, ...weekGroups, actionsCol]
  }, [exercises, onChangeCell, onDeleteRow, onSaveRow, onAddCustomExercise, visibleWeeks, weekFilter, data, editingCells])

  const filteredData = useMemo(() => {
    const f = filter.trim().toLowerCase()
    if (!f) return data
    return data.filter((r) => r.exercise.toLowerCase().includes(f))
  }, [data, filter])

  const table = useReactTable({ data: filteredData, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="rounded-2xl glass shadow-xl animate-fadeIn overflow-hidden flex flex-col">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 flex flex-col gap-4 p-4 border-b-2 border-gradient-to-r from-indigo-100 via-violet-100 to-indigo-100 bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Поиск */}
          <div className="relative flex-shrink-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 dark:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Поиск упражнения..."
              className="h-10 w-full sm:w-64 pl-10 pr-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-600 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 focus:outline-none transition-all"
            />
            {filter && (
              <button
                onClick={() => setFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center transition-colors group"
                title="Очистить"
              >
                <svg className="w-3 h-3 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Фильтр недель и счетчик */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Селектор недели */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border border-purple-100 dark:border-purple-800">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300 whitespace-nowrap">Показать:</span>
              <select
                value={weekFilter}
                onChange={(e) => setWeekFilter(Number(e.target.value))}
                className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-transparent border-0 outline-none cursor-pointer pr-1"
              >
                <option value={0}>Все недели</option>
                {Array.from({ length: visibleWeeks }, (_, i) => i + 1).map((week) => (
                  <option key={week} value={week}>Неделя {week}</option>
                ))}
              </select>
            </div>

            {/* Счетчик записей */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950 border border-indigo-100 dark:border-indigo-800">
              <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{filteredData.length}</span>
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">записей</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Desktop: Scrollable table container */}
      {!isMobileView && (
        <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
          <table className="min-w-full table-fixed text-[13px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 glass-strong supports-backdrop-blur:border-b">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    colSpan={h.colSpan}
                    className={`text-center text-[11px] font-medium tracking-wide text-slate-600 dark:text-slate-300 bg-white/95 dark:bg-slate-900/95 ${h.isPlaceholder ? 'p-0' : 'px-2 py-3'}`}
                  >
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="[&_tr:nth-child(even)]:bg-gradient-to-r [&_tr:nth-child(even)]:from-slate-50/80 [&_tr:nth-child(even)]:to-slate-50/40 dark:[&_tr:nth-child(even)]:from-slate-800/40 dark:[&_tr:nth-child(even)]:to-slate-800/20">
            {table.getRowModel().rows.map((row, idx) => (
              <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:via-white hover:to-violet-50/50 dark:hover:from-slate-900/60 dark:hover:via-slate-900/40 dark:hover:to-slate-900/60 transition-all duration-200 animate-fadeIn group" style={{ animationDelay: `${idx * 50}ms` }}>
                {row.getVisibleCells().map((cell, i) => (
                  <td key={cell.id} className={`px-3 py-3 text-sm text-slate-800 dark:text-slate-100 ${i === 0 ? 'sticky left-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-[2px_0_8px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_8px_rgba(0,0,0,0.3)] group-hover:shadow-[2px_0_12px_rgba(99,102,241,0.15)] dark:group-hover:shadow-[2px_0_12px_rgba(99,102,241,0.3)]' : ''}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={26} className="px-4 py-20 text-center">
                  <div className="flex flex-col items-center gap-3 animate-fadeIn">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Пока нет тренировок</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Добавьте первую запись, чтобы начать</p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      )}

      {/* Mobile: Card view */}
      {isMobileView && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-250px)]">
          {filteredData.length === 0 ? (
            <div className="flex flex-col items-center gap-3 animate-fadeIn py-20">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Пока нет тренировок</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Добавьте первую запись, чтобы начать</p>
              </div>
            </div>
          ) : (
            filteredData.map((training, rowIndex) => (
              <MobileTrainingCard
                key={training.id ? `training-${training.id}` : `row-${rowIndex}-${training.exercise}`}
                training={training}
                exercises={exercises}
                weekFilter={weekFilter}
                visibleWeeks={visibleWeeks}
                onDelete={() => onDeleteRow(rowIndex)}
                onSave={() => onSaveRow(rowIndex)}
                onOpen1RM={() => open1RMCalculator(rowIndex)}
                onAddCustomExercise={onAddCustomExercise}
                onChangeCell={(key, val) => onChangeCell(rowIndex, key, val)}
              />
            ))
          )}
        </div>
      )}
      
      {/* Footer - Fixed */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 border-t-2 border-gradient-to-r from-indigo-100 via-violet-100 to-indigo-100 bg-gradient-to-br from-slate-50/80 to-white/80 dark:from-slate-800/80 dark:to-slate-900/80 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border border-amber-200 dark:border-amber-800">
            <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-amber-700 dark:text-amber-300">Подсказка:</span>
          </div>
          <span className="hidden sm:inline">Ctrl+Enter добавит новую строку • Alt+↑/↓ изменит значение</span>
        </div>
        {onAddRow && (
          <Button 
            size="sm" 
            className="h-9 rounded-xl px-5 text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 hover:shadow-xl hover:shadow-emerald-300/60 dark:hover:shadow-emerald-800/60 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            onPress={onAddRow}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить строку
          </Button>
        )}
      </div>

      {/* Калькулятор 1ПМ */}
      <OneRMCalculator
        isOpen={is1RMOpen}
        onClose={on1RMClose}
        onApply={handle1RMApply}
        visibleWeeks={visibleWeeks}
      />
    </div>
  )
}


