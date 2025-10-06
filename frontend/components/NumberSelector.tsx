"use client"
import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  value: number | string
  onChange: (value: string) => void
  onBlur?: () => void
  min?: number
  max?: number
  placeholder?: string
  type: 'reps' | 'weight'
  className?: string
}

export default function NumberSelector({ value, onChange, onBlur, min = 1, max = 100, placeholder = "0", type, className = "" }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [localValue, setLocalValue] = useState(String(value || ''))
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    setLocalValue(String(value || ''))
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target)
      const clickedOutsideInput = inputRef.current && !inputRef.current.contains(target)
      
      if (clickedOutsideDropdown && clickedOutsideInput) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect()
        setDropdownPosition({
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width
        })
      }
    }

    if (isOpen) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  // Генерируем числа для выбора
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  
  // Фильтрация чисел
  const filteredNumbers = filter 
    ? numbers.filter(n => String(n).includes(filter))
    : numbers

  // Популярные веса для быстрого выбора
  const popularWeights = type === 'weight' 
    ? [20, 40, 60, 80, 100, 120, 140, 160, 180, 200]
    : [5, 8, 10, 12, 15, 20]

  const handleSelect = (num: number) => {
    setLocalValue(String(num))
    onChange(String(num))
    setIsOpen(false)
  }

  const handleInputChange = (val: string) => {
    setLocalValue(val)
    setFilter(val)
    setIsOpen(true)
  }

  const handleBlur = () => {
    if (localValue !== String(value)) {
      onChange(localValue)
    }
    onBlur?.()
  }

  return (
    <>
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        placeholder={placeholder}
        className={className}
        value={localValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          setFilter(localValue)
          setIsOpen(true)
        }}
        onBlur={handleBlur}
      />

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] rounded-lg bg-white dark:bg-slate-800 shadow-2xl border-2 border-indigo-200 dark:border-indigo-700 overflow-hidden animate-scaleIn"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${Math.max(dropdownPosition.width, 200)}px`,
            maxHeight: '300px'
          }}
        >
          <div className="sticky top-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-b-2 border-indigo-100 dark:border-indigo-800 px-3 py-2">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium">{type === 'reps' ? 'Повторы' : 'Вес, кг'}</span>
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">{filteredNumbers.length}</span>
            </div>
          </div>

          {/* Популярные значения */}
          {!filter && (
            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 px-1">Популярные</div>
              <div className="flex flex-wrap gap-1">
                {popularWeights.map((num) => (
                  <button
                    key={num}
                    onClick={() => handleSelect(num)}
                    className="px-2 py-1 text-xs font-bold rounded-md bg-gradient-to-r from-indigo-100 to-violet-100 dark:from-indigo-900 dark:to-violet-900 text-indigo-700 dark:text-indigo-300 hover:from-indigo-200 hover:to-violet-200 dark:hover:from-indigo-800 dark:hover:to-violet-800 transition-all"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-1 overflow-y-auto" style={{ maxHeight: '200px' }}>
            {filteredNumbers.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500 dark:text-slate-400">
                Ничего не найдено
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-0.5">
                {filteredNumbers.map((num) => (
                  <button
                    key={num}
                    onClick={() => handleSelect(num)}
                    className="px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-violet-50 dark:hover:from-indigo-950 dark:hover:to-violet-950 rounded transition-all hover:scale-105"
                  >
                    {num}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

