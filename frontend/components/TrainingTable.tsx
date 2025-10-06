"use client"
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@heroui/react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import ExerciseSelector, { Exercise } from './ExerciseSelector'

export type Training = {
  id?: number
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

  function handleKeyNav(e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) {
    const key = e.key
    const isShift = e.shiftKey
    const isCtrl = e.ctrlKey || e.metaKey
    const lastRow = data.length - 1
    const lastCol = numCols - 1

    if (isCtrl && key === 'Enter') {
      e.preventDefault()
      onAddRow?.()
      // Focus new row first cell on next tick
      setTimeout(() => focusCell(data.length, 0), 0)
      return
    }

    if (key === 'Enter') {
      e.preventDefault()
      const nextRow = isShift ? Math.max(0, rowIndex - 1) : Math.min(lastRow, rowIndex + 1)
      focusCell(nextRow, colIndex)
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
      focusCell(nextR, nextC)
      return
    }

    if (key === 'ArrowRight') { e.preventDefault(); focusCell(rowIndex, Math.min(lastCol, colIndex + 1)); return }
    if (key === 'ArrowLeft')  { e.preventDefault(); focusCell(rowIndex, Math.max(0, colIndex - 1)); return }
    if (key === 'ArrowDown')  { e.preventDefault(); focusCell(Math.min(lastRow, rowIndex + 1), colIndex); return }
    if (key === 'ArrowUp')    { e.preventDefault(); focusCell(Math.max(0, rowIndex - 1), colIndex); return }
  }
  const columns = useMemo<ColumnDef<Training>[]>(() => {
    const exerciseCol: ColumnDef<Training> = {
      accessorKey: 'exercise',
      header: () => (
        <div className="text-left">
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-1.5 ring-2 ring-indigo-100">
            <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">Упражнение</span>
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

    const weekGroups: ColumnDef<Training>[] = Array.from({ length: visibleWeeks }, (_, i) => i + 1).map((week) => {
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
              <div className="text-center">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  <span className="text-[10px] font-semibold text-slate-600">{`${idx+1}`}</span>
                </div>
              </div>
            ),
            cell: ({ row }) => (
              <div className="relative mx-auto h-10 w-36 select-none group">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 opacity-60 group-hover:opacity-100 transition-opacity border border-slate-200/60 dark:border-slate-600/60"></div>
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
                <div className="absolute inset-0 grid grid-cols-2 gap-0">
                  <div className="relative flex items-center justify-center">
                    <input
                      ref={(el) => { if (!cellRefs.current[row.index]) cellRefs.current[row.index] = []; cellRefs.current[row.index][repsColIndex] = el as HTMLInputElement }}
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      className="col-span-1 h-full w-full rounded-l-lg border-0 bg-transparent px-2 text-center font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 focus:ring-offset-0 focus:bg-white/80 dark:focus:bg-slate-700/80 transition-all"
                      value={(row.original as any)[repsKey] as number}
                      onChange={(e) => onChangeCell(row.index, repsKey as any, e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey) {
                          e.preventDefault()
                          const current = Number((row.original as any)[repsKey] || 0)
                          const step = e.shiftKey ? 5 : 1
                          const delta = e.key === 'ArrowUp' ? step : -step
                          const next = Math.max(0, current + delta)
                          onChangeCell(row.index, repsKey as any, String(next))
                          return
                        }
                        handleKeyNav(e, row.index, repsColIndex)
                      }}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label="Повторы"
                    />
                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">rep</span>
                  </div>
                  <div className="relative flex items-center justify-center">
                    <input
                      ref={(el) => { if (!cellRefs.current[row.index]) cellRefs.current[row.index] = []; cellRefs.current[row.index][kgColIndex] = el as HTMLInputElement }}
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      className="col-span-1 h-full w-full rounded-r-lg border-0 bg-transparent px-2 text-center font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 focus:ring-offset-0 focus:bg-white/80 dark:focus:bg-slate-700/80 transition-all"
                      value={(row.original as any)[kgKey] as number}
                      onChange={(e) => onChangeCell(row.index, kgKey as any, e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey) {
                          e.preventDefault()
                          const current = Number((row.original as any)[kgKey] || 0)
                          const step = e.shiftKey ? 5 : 1
                          const delta = e.key === 'ArrowUp' ? step : -step
                          const next = Math.max(0, current + delta)
                          onChangeCell(row.index, kgKey as any, String(next))
                          return
                        }
                        handleKeyNav(e, row.index, kgColIndex)
                      }}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label="Килограммы"
                    />
                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">kg</span>
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
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100/80">
            <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Действия</span>
          </div>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex gap-2 animate-fadeIn">
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
            className="h-9 rounded-xl px-4 text-xs font-semibold text-red-600 border-2 border-red-200 bg-white hover:bg-red-50 hover:border-red-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
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
  }, [exercises, onChangeCell, onDeleteRow, onSaveRow, onAddCustomExercise, visibleWeeks])

  const filteredData = useMemo(() => {
    const f = filter.trim().toLowerCase()
    if (!f) return data
    return data.filter((r) => r.exercise.toLowerCase().includes(f))
  }, [data, filter])

  const table = useReactTable({ data: filteredData, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="overflow-x-auto rounded-2xl glass shadow-xl animate-fadeIn">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between border-b-2 border-gradient-to-r from-indigo-100 via-violet-100 to-indigo-100 bg-gradient-to-br from-white/80 to-slate-50/80">
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Поиск упражнения..."
              className="h-10 w-64 pl-10 pr-4 rounded-xl border-2 border-slate-200 bg-white/90 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all"
            />
            {filter && (
              <button
                onClick={() => setFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors group"
                title="Очистить"
              >
                <svg className="w-3 h-3 text-slate-600 group-hover:text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100">
            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-bold text-indigo-700">{filteredData.length}</span>
            <span className="text-xs font-medium text-indigo-600">записей</span>
          </div>
        </div>
      </div>
      <table className="min-w-full table-fixed text-[13px] border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 glass-strong supports-backdrop-blur:border-b">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b">
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  colSpan={h.colSpan}
                  className={`text-center text-[11px] font-medium tracking-wide text-slate-600 dark:text-slate-300 ${h.isPlaceholder ? 'p-0 bg-transparent' : 'px-2 py-2'}`}
                >
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="[&_tr:nth-child(even)]:bg-gradient-to-r [&_tr:nth-child(even)]:from-slate-50/80 [&_tr:nth-child(even)]:to-slate-50/40 dark:[&_tr:nth-child(even)]:from-slate-800/40 dark:[&_tr:nth-child(even)]:to-slate-800/20">
          {table.getRowModel().rows.map((row, idx) => (
            <tr key={row.id} className="border-b border-slate-100 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:via-white hover:to-violet-50/50 dark:hover:from-slate-900/60 dark:hover:via-slate-900/40 dark:hover:to-slate-900/60 transition-all duration-200 animate-fadeIn group" style={{ animationDelay: `${idx * 50}ms` }}>
              {row.getVisibleCells().map((cell, i) => (
                <td key={cell.id} className={`px-3 py-3 text-sm text-slate-800 dark:text-slate-100 ${i === 0 ? 'sticky left-0 z-20 glass-strong shadow-[2px_0_8px_rgba(0,0,0,0.06)] group-hover:shadow-[2px_0_12px_rgba(99,102,241,0.15)]' : ''}`}>
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t-2 border-gradient-to-r from-indigo-100 via-violet-100 to-indigo-100 bg-gradient-to-br from-slate-50/80 to-white/80 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
            <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-amber-700">Подсказка:</span>
          </div>
          <span className="hidden sm:inline">Ctrl+Enter добавит новую строку • Alt+↑/↓ изменит значение</span>
        </div>
        {onAddRow && (
          <Button 
            size="sm" 
            className="h-9 rounded-xl px-5 text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200/50 hover:shadow-xl hover:shadow-emerald-300/60 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            onPress={onAddRow}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить строку
          </Button>
        )}
      </div>
    </div>
  )
}


