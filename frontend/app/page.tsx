"use client"
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import TrainingTable, { Training } from '../components/TrainingTable'
import { Button } from '@heroui/react'

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080' })

export default function HomePage() {
  const [rows, setRows] = useState<Training[]>([])
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

  useEffect(() => {
    fetchRows()
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl glass p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Планируйте тренировки</h1>
            <p className="text-sm text-slate-600">Быстро фиксируйте подходы и веса по неделям.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="flat" onPress={() => setVisibleWeeks(Math.max(1, visibleWeeks - 1))}>- Неделя</Button>
            <Button variant="flat" onPress={() => setVisibleWeeks(Math.min(8, visibleWeeks + 1))}>+ Неделя</Button>
            <Button color="primary" onPress={addRow}>Добавить строку</Button>
            <Button variant="flat" onPress={fetchRows}>Обновить</Button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs">
          {loading && <span className="text-slate-600">Загрузка…</span>}
          {error && <span className="text-red-600">{error}</span>}
        </div>
      </div>
      <TrainingTable
        data={rows}
        onChangeCell={updateCell}
        onSaveRow={saveRow}
        onDeleteRow={async (i) => deleteRow(i)}
        onAddRow={addRow}
        visibleWeeks={visibleWeeks}
      />
    </div>
  )
}

