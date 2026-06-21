'use client'
import { useEffect, useRef } from 'react'

interface KeyboardHandlers {
  onPrevStep: () => void
  onNextStep: () => void
  onResetCamera: () => void
  onDistanceTool: () => void
  onAngleTool: () => void
}

export function useKeyboardShortcuts(handlers: KeyboardHandlers) {
  // Use ref to avoid stale closures — no need to re-register listener on each render
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Do not fire when user is typing
      const target = e.target as HTMLElement
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return
      if (target.isContentEditable) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          handlersRef.current.onPrevStep()
          break
        case 'ArrowRight':
          e.preventDefault()
          handlersRef.current.onNextStep()
          break
        case 'r':
        case 'R':
          handlersRef.current.onResetCamera()
          break
        case 'd':
        case 'D':
          handlersRef.current.onDistanceTool()
          break
        case 'a':
        case 'A':
          handlersRef.current.onAngleTool()
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, []) // empty deps — handlers always accessed via ref
}
