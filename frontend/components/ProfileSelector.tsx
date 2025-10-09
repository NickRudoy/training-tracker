"use client"
import React, { useState } from 'react'
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react'

export type Profile = {
  id: number
  name: string
  createdAt: string
  updatedAt: string
}

type Props = {
  profiles: Profile[]
  currentProfile: Profile | null
  onSelectProfile: (profile: Profile) => void
  onCreateProfile: (name: string) => Promise<void>
  onDeleteProfile: (id: number) => Promise<void>
}

export default function ProfileSelector({
  profiles,
  currentProfile,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile
}: Props) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [newProfileName, setNewProfileName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!newProfileName.trim()) return
    
    setIsCreating(true)
    try {
      await onCreateProfile(newProfileName.trim())
      setNewProfileName('')
      onClose()
    } catch (error) {
      console.error('Failed to create profile:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (profiles.length <= 1) {
      alert('Нельзя удалить последний профиль!')
      return
    }
    if (!confirm('Вы уверены? Все тренировки этого профиля будут удалены!')) {
      return
    }
    await onDeleteProfile(id)
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {/* Dropdown для выбора профиля */}
        <div className="relative flex-shrink-0">
          <select
            value={currentProfile?.id || ''}
            onChange={(e) => {
              const profile = profiles.find(p => p.id === Number(e.target.value))
              if (profile) onSelectProfile(profile)
            }}
            className="h-11 md:h-12 pl-4 pr-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 hover:border-sky-300 dark:hover:border-sky-600 focus:border-sky-500 dark:focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/30 focus:outline-none transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>

        {/* Кнопка добавления профиля */}
        <Button
          size="sm"
          onPress={onOpen}
          className="h-11 md:h-12 min-w-[48px] px-4 md:px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
          title="Добавить профиль"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Button>

        {/* Кнопка удаления текущего профиля */}
        {profiles.length > 1 && currentProfile && (
          <Button
            size="sm"
            variant="bordered"
            onPress={() => currentProfile && handleDelete(currentProfile.id)}
            className="h-11 md:h-12 min-w-[48px] px-4 md:px-5 rounded-xl border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-300 dark:hover:border-red-700 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            title="Удалить профиль"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        )}
      </div>

      {/* Modal для создания профиля */}
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        placement="center"
        backdrop="opaque"
        classNames={{
          wrapper: "z-[9999]",
          base: "bg-white dark:bg-slate-900",
        }}
      >
        <ModalContent className="bg-white dark:bg-slate-900">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/50">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Новый профиль</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">Создайте отдельный план тренировок</p>
                </div>
              </ModalHeader>

              <ModalBody className="pt-6">
                <div>
                  <label className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                    Название профиля
                  </label>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="Например: Массонабор, Сушка, Сила..."
                    className="w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all duration-300 shadow-sm hover:shadow-md"
                    autoFocus
                  />
                </div>
              </ModalBody>

              <ModalFooter className="pt-6 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="light"
                  onPress={onClose}
                  className="h-11 px-6 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300"
                >
                  Отмена
                </Button>
                <Button
                  onPress={handleCreate}
                  isDisabled={!newProfileName.trim() || isCreating}
                  isLoading={isCreating}
                  className="h-11 px-8 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                >
                  Создать
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}

