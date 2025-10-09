"use client"
import React from 'react'
import { Modal, type ModalProps } from '@heroui/react'

type UiModalProps = ModalProps

export default function UiModal({ children, ...props }: UiModalProps) {
  return (
    <Modal
      placement="center"
      backdrop="blur"
      scrollBehavior="inside"
      classNames={{
        backdrop: 'bg-slate-900/50 backdrop-blur-sm',
        wrapper: 'z-[9999]',
        base: 'bg-white dark:bg-slate-900',
      }}
      {...props}
    >
      {children}
    </Modal>
  )
}


