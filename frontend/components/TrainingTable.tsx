"use client"
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@heroui/react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

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
  onChangeCell: (rowIndex: number, key: keyof Training, value: string) => void
  onSaveRow: (rowIndex: number) => Promise<void>
  onDeleteRow: (rowIndex: number) => Promise<void>
  onAddRow?: () => void
  visibleWeeks?: number
}

export default function TrainingTable({ data, onChangeCell, onSaveRow, onDeleteRow, onAddRow, visibleWeeks = 4 }: Props) {
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
          <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">Упражнение</span>
        </div>
      ),
      cell: ({ row }) => (
        <input
          ref={(el) => { if (!cellRefs.current[row.index]) cellRefs.current[row.index] = []; cellRefs.current[row.index][0] = el as HTMLInputElement }}
          className="w-full rounded-none border-0 bg-transparent px-2 py-1 text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300/50"
          value={row.original.exercise}
          onChange={(e) => onChangeCell(row.index, 'exercise', e.target.value)}
          onKeyDown={(e) => handleKeyNav(e, row.index, 0)}
          onFocus={(e) => e.currentTarget.select()}
          placeholder="Упражнение"
        />
      ),
    }

    const weekGroups: ColumnDef<Training>[] = Array.from({ length: visibleWeeks }, (_, i) => i + 1).map((week) => {
      const pairs = (['d1','d2','d3','d4','d5','d6'] as const).map((d) => ({ reps: `week${week}${d}Reps`, kg: `week${week}${d}Kg` }))
      return {
        id: `week${week}`,
        header: () => (
          <div className="col-span-6">
            <div className="mx-2 rounded-md bg-slate-50 px-3 py-2 text-center ring-1 ring-inset ring-slate-200">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">{`Неделя ${week}`}</span>
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
                <span className="text-[11px] font-medium text-slate-600">{`Подход ${idx+1}`}</span>
              </div>
            ),
            cell: ({ row }) => (
              <div className="relative mx-auto h-9 w-32 select-none">
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[50%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-slate-300/70"></div>
                <div className="absolute inset-0 grid grid-cols-2">
                  <input
                    ref={(el) => { if (!cellRefs.current[row.index]) cellRefs.current[row.index] = []; cellRefs.current[row.index][repsColIndex] = el as HTMLInputElement }}
                    type="number"
                    inputMode="numeric"
                    placeholder="Повт."
                    className="col-span-1 h-full w-full rounded-none border-0 bg-transparent px-1 text-center font-mono text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300/50"
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
                  <input
                    ref={(el) => { if (!cellRefs.current[row.index]) cellRefs.current[row.index] = []; cellRefs.current[row.index][kgColIndex] = el as HTMLInputElement }}
                    type="number"
                    inputMode="numeric"
                    placeholder="Кг"
                    className="col-span-1 h-full w-full rounded-none border-0 bg-transparent px-1 text-center font-mono text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300/50"
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
                </div>
              </div>
            ),
          } as ColumnDef<Training>
        })
      } as ColumnDef<Training>
    })

    const actionsCol: ColumnDef<Training> = {
      id: 'actions',
      header: () => <span className="sr-only">Действия</span>,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="solid"
            className="h-8 rounded-full px-3.5 text-xs font-medium text-white shadow-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99]"
            onPress={() => onSaveRow(row.index)}
          >
            Сохранить
          </Button>
          <Button
            size="sm"
            variant="bordered"
            className="h-8 rounded-full px-3.5 text-xs font-medium text-red-600 border-red-200 hover:bg-red-50/60 active:scale-[0.99]"
            onPress={() => onDeleteRow(row.index)}
          >
            Удалить
          </Button>
        </div>
      ),
    }

    return [exerciseCol, ...weekGroups, actionsCol]
  }, [onChangeCell, onDeleteRow, onSaveRow, visibleWeeks])

  const filteredData = useMemo(() => {
    const f = filter.trim().toLowerCase()
    if (!f) return data
    return data.filter((r) => r.exercise.toLowerCase().includes(f))
  }, [data, filter])

  const table = useReactTable({ data: filteredData, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="overflow-x-auto rounded-2xl glass">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/40 dark:border-slate-700/40">
        <div className="flex items-center gap-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Фильтр по упражнению..."
            className="h-9 w-56 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
          {filter && (
            <button
              onClick={() => setFilter("")}
              className="h-9 rounded-md px-2 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            >Сброс</button>
          )}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-300">{filteredData.length} записей</div>
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
        <tbody className="[&_tr:nth-child(even)]:bg-slate-50/50 dark:[&_tr:nth-child(even)]:bg-slate-800/40">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b transition-colors hover:bg-white/50 dark:hover:bg-slate-900/40">
              {row.getVisibleCells().map((cell, i) => (
                <td key={cell.id} className={`px-2 py-2 text-sm text-slate-800 dark:text-slate-100 ${i === 0 ? 'sticky left-0 z-20 glass-strong shadow-[inset_-1px_0_0_rgba(0,0,0,0.04)]' : ''}`}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {filteredData.length === 0 && (
            <tr>
              <td colSpan={26} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Пока нет тренировок. Добавьте запись.</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-slate-200/40 px-3 py-2 text-xs text-slate-600 dark:border-slate-700/40">
        <span>Подсказка: Ctrl+Enter добавит новую строку во время редактирования</span>
        {onAddRow && (
          <Button size="sm" variant="flat" className="shadow-sm" onPress={onAddRow}>Добавить строку</Button>
        )}
      </div>
    </div>
  )
}


