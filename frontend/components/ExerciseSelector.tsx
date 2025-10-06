"use client"
import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip } from '@heroui/react'

export type Exercise = {
  id: number
  name: string
  description: string
  category: string
  muscleGroup: string
  isCustom: boolean
}

type Props = {
  exercises: Exercise[]
  value: string
  onChange: (value: string) => void
  onAddCustomExercise: (exercise: Omit<Exercise, 'id' | 'isCustom'>) => Promise<void>
  className?: string
}

export default function ExerciseSelector({ exercises, value, onChange, onAddCustomExercise, className }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [localValue, setLocalValue] = useState(value) // Локальное значение для ввода
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const { isOpen: isAddModalOpen, onOpen: onAddModalOpen, onClose: onAddModalClose } = useDisclosure()
  const [newExercise, setNewExercise] = useState({ name: '', description: '', category: '', muscleGroup: '' })
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

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
    const exercise = exercises.find(ex => ex.name === value)
    setSelectedExercise(exercise || null)
    setLocalValue(value) // Синхронизируем локальное значение с пропсом
  }, [value, exercises])

  // Рассчитываем позицию dropdown при открытии и прокрутке
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect()
        setDropdownPosition({
          top: rect.bottom + 8,
          left: rect.left,
          width: Math.max(rect.width, 600)
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

  const filteredExercises = exercises.filter(ex => {
    const searchTerm = (filter || '').toLowerCase()
    return (
      ex.name.toLowerCase().includes(searchTerm) ||
      ex.muscleGroup.toLowerCase().includes(searchTerm) ||
      ex.category.toLowerCase().includes(searchTerm)
    )
  })

  const groupedExercises = filteredExercises.reduce((acc, ex) => {
    if (!acc[ex.muscleGroup]) {
      acc[ex.muscleGroup] = []
    }
    acc[ex.muscleGroup].push(ex)
    return acc
  }, {} as Record<string, Exercise[]>)

  const handleSelect = (exercise: Exercise) => {
    setLocalValue(exercise.name)
    onChange(exercise.name)
    setIsOpen(false)
    setFilter(exercise.name)
  }

  const handleBlur = () => {
    // При потере фокуса сохраняем значение
    if (localValue !== value) {
      onChange(localValue)
    }
  }

  const handleAddCustom = async () => {
    if (!newExercise.name.trim()) return
    await onAddCustomExercise(newExercise)
    setNewExercise({ name: '', description: '', category: '', muscleGroup: '' })
    onAddModalClose()
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={className || "w-full h-10 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 pr-20 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30"}
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value)
            setFilter(e.target.value)
            setIsOpen(true)
          }}
          onBlur={handleBlur}
          onFocus={() => {
            setFilter(localValue)
            setIsOpen(true)
          }}
          placeholder="Начните вводить название упражнения..."
        />
        <button
          onClick={onAddModalOpen}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2.5 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-1"
          title="Добавить своё упражнение"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Своё
        </button>
      </div>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] rounded-xl bg-white dark:bg-slate-800 shadow-2xl border-2 border-indigo-200 dark:border-indigo-700 max-h-[400px] overflow-hidden animate-scaleIn"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          <div className="sticky top-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-b-2 border-indigo-100 dark:border-indigo-800 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-medium">Найдено: {filteredExercises.length} упражнений</span>
            </div>
          </div>

          <div className="p-2 overflow-y-auto max-h-[330px]">
            {filteredExercises.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <p className="text-sm font-medium">Ничего не найдено</p>
                <p className="text-xs mt-1">Попробуйте другой запрос или добавьте своё</p>
              </div>
            ) : (
              Object.entries(groupedExercises).map(([group, exs], idx) => (
              <div key={group} className="mb-3 animate-fadeIn" style={{ animationDelay: `${idx * 30}ms` }}>
                <div className="flex items-center gap-2 px-3 py-1.5 mb-1 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950 rounded-lg border border-indigo-100 dark:border-indigo-800">
                  <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">{group}</span>
                  <span className="ml-auto text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">{exs.length}</span>
                </div>
                <div className="space-y-0.5">
                  {exs.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => handleSelect(ex)}
                      className="w-full text-left px-3 py-2.5 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-violet-50 dark:hover:from-indigo-950 dark:hover:to-violet-950 rounded-lg transition-all duration-200 group border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {ex.name}
                        </span>
                        {ex.isCustom && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900 text-amber-700 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-700">
                            Свое
                          </span>
                        )}
                        <span className="ml-auto px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded">{ex.category}</span>
                      </div>
                      {ex.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 leading-relaxed">
                          {ex.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}

      {selectedExercise && selectedExercise.description && !isOpen && (
        <div className="mt-2 p-3 text-xs bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950 rounded-lg border border-indigo-100 dark:border-indigo-800 animate-fadeIn">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-indigo-700 dark:text-indigo-300">{selectedExercise.muscleGroup}</span>
                <span className="text-indigo-400 dark:text-indigo-500">•</span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">{selectedExercise.category}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedExercise.description}</p>
            </div>
          </div>
        </div>
      )}

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={onAddModalClose} 
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Добавить свое упражнение</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Создайте упражнение с описанием техники</p>
                </div>
              </ModalHeader>
          <ModalBody className="pt-6">
            <div className="space-y-5">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Название упражнения *
                </label>
                <input
                  type="text"
                  className="w-full h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  placeholder="Например: Жим гантелей под углом"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Группа мышц
                  </label>
                  <select
                    className="w-full h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
                    value={newExercise.muscleGroup}
                    onChange={(e) => setNewExercise({ ...newExercise, muscleGroup: e.target.value })}
                  >
                    <option value="">Выберите группу</option>
                    <option value="Грудь">💪 Грудь</option>
                    <option value="Спина">🔙 Спина</option>
                    <option value="Ноги">🦵 Ноги</option>
                    <option value="Плечи">💪 Плечи</option>
                    <option value="Руки">💪 Руки</option>
                    <option value="Пресс">🔥 Пресс</option>
                    <option value="Другое">➕ Другое</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Категория
                  </label>
                  <select
                    className="w-full h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
                    value={newExercise.category}
                    onChange={(e) => setNewExercise({ ...newExercise, category: e.target.value })}
                  >
                    <option value="">Выберите категорию</option>
                    <option value="Базовое">⚡ Базовое</option>
                    <option value="Изолирующее">🎯 Изолирующее</option>
                    <option value="Кардио">❤️ Кардио</option>
                    <option value="Растяжка">🧘 Растяжка</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Описание / Техника выполнения
                </label>
                <textarea
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all resize-none"
                  rows={4}
                  value={newExercise.description}
                  onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                  placeholder="Опишите технику выполнения упражнения, положение тела, дыхание и основные моменты..."
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="pt-6 border-t border-slate-200 dark:border-slate-700">
            <Button 
              variant="bordered" 
              onPress={onAddModalClose}
              className="h-10 rounded-xl px-5 border-2 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Отмена
            </Button>
            <Button
              onPress={handleAddCustom}
              isDisabled={!newExercise.name.trim()}
              className="h-10 rounded-xl px-6 font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Добавить упражнение
            </Button>
          </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}

