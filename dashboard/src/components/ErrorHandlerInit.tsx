'use client'

import { useEffect } from 'react'
import { setupGlobalErrorHandlers } from '@/lib/error-logger'

export function ErrorHandlerInit() {
  useEffect(() => {
    setupGlobalErrorHandlers()
  }, [])

  return null
}
