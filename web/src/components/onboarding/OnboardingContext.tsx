'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { getStepsForPage, type OnboardingStep } from './steps'

interface OnboardingContextType {
  // State
  steps: OnboardingStep[]
  currentStepIndex: number
  isOpen: boolean
  isMinimized: boolean
  permanentlyClosed: boolean
  hasSeenTour: boolean
  isFirstTime: boolean
  
  // Actions
  startTour: () => void
  nextStep: () => void
  prevStep: () => void
  closeTour: () => void
  minimizeTour: () => void
  openTour: () => void
  closePermanently: () => void
  resetTour: () => void
  markPageCompleted: () => void
  
  // Computed
  currentStep: OnboardingStep | null
  isLastStep: boolean
  isFirstStep: boolean
  progress: number
}

const OnboardingContext = createContext<OnboardingContextType | null>(null)

function getStorageKey(userId: string, page: string) {
  return `mm_onboarding_${userId}_${page.replace(/\//g, '_')}`
}

function getGlobalKey(userId: string) {
  return `mm_onboarding_global_${userId}`
}

function getClosedKey(userId: string) {
  return `mm_onboarding_closed_${userId}`
}

export function OnboardingProvider({
  children,
  userId,
  userRole,
}: {
  children: React.ReactNode
  userId: string
  userRole: string
}) {
  const pathname = usePathname()
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [permanentlyClosed, setPermanentlyClosed] = useState(false)
  const [hasSeenTour, setHasSeenTour] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Load state from localStorage
  useEffect(() => {
    if (!userId || !pathname) return
    
    const pageKey = getStorageKey(userId, pathname)
    const globalKey = getGlobalKey(userId)
    const closedKey = getClosedKey(userId)
    
    try {
      // Check if permanently closed
      const closedData = localStorage.getItem(closedKey)
      if (closedData) {
        const closedState = JSON.parse(closedData)
        if (closedState.closed) {
          setPermanentlyClosed(true)
          setIsLoaded(true)
          return
        }
      }
      
      const saved = localStorage.getItem(pageKey)
      const globalSaved = localStorage.getItem(globalKey)
      
      const pageSteps = getStepsForPage(pathname, userRole)
      setSteps(pageSteps)
      
      if (saved) {
        const state = JSON.parse(saved)
        setCurrentStepIndex(state.currentStepIndex || 0)
        setIsMinimized(state.isMinimized || false)
        setHasSeenTour(true)
        
        if (state.completed) {
          setIsOpen(false)
        } else if (!state.dismissed && pageSteps.length > 0) {
          // Resume tour if not completed
          setTimeout(() => setIsOpen(true), 500)
        }
      } else {
        // First time on this page
        setCurrentStepIndex(0)
        setIsMinimized(false)
        setHasSeenTour(false)
        
        if (pageSteps.length > 0) {
          // Auto-open after delay for first-time users
          setTimeout(() => setIsOpen(true), 1200)
        }
      }
      
      // Mark page as visited globally
      const global = globalSaved ? JSON.parse(globalSaved) : { pagesVisited: [] }
      if (!global.pagesVisited.includes(pathname)) {
        global.pagesVisited.push(pathname)
        localStorage.setItem(globalKey, JSON.stringify(global))
      }
    } catch (e) {
      console.error('Onboarding load error:', e)
    }
    
    setIsLoaded(true)
  }, [pathname, userId, userRole])
  
  // Persist state changes
  useEffect(() => {
    if (!isLoaded || !userId || !pathname || permanentlyClosed) return
    
    const pageKey = getStorageKey(userId, pathname)
    const state = {
      currentStepIndex,
      isMinimized,
      completed: currentStepIndex >= steps.length - 1 && steps.length > 0,
      dismissed: !isOpen && !isMinimized && steps.length > 0,
      timestamp: Date.now(),
    }
    
    localStorage.setItem(pageKey, JSON.stringify(state))
  }, [currentStepIndex, isOpen, isMinimized, steps.length, pathname, userId, isLoaded, permanentlyClosed])
  
  const currentStep = steps[currentStepIndex] || null
  const isLastStep = currentStepIndex >= steps.length - 1
  const isFirstStep = currentStepIndex === 0
  const progress = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0
  const isCompleted = steps.length > 0 && currentStepIndex >= steps.length - 1
  const isFirstTime = !hasSeenTour && steps.length > 0
  
  const startTour = useCallback(() => {
    setCurrentStepIndex(0)
    setIsMinimized(false)
    setIsOpen(true)
    setHasSeenTour(true)
  }, [])
  
  const nextStep = useCallback(() => {
    if (isLastStep) {
      setIsOpen(false)
      setIsMinimized(false)
      setHasSeenTour(true)
    } else {
      setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1))
    }
  }, [isLastStep, steps.length])
  
  const prevStep = useCallback(() => {
    setCurrentStepIndex(prev => Math.max(prev - 1, 0))
  }, [])
  
  const closeTour = useCallback(() => {
    setIsOpen(false)
    setIsMinimized(false)
    setHasSeenTour(true)
  }, [])
  
  const minimizeTour = useCallback(() => {
    setIsOpen(false)
    setIsMinimized(true)
    setHasSeenTour(true)
  }, [])
  
  const openTour = useCallback(() => {
    setIsOpen(true)
    setIsMinimized(false)
    setPermanentlyClosed(false)
  }, [])
  
  const closePermanently = useCallback(() => {
    setPermanentlyClosed(true)
    setIsOpen(false)
    setIsMinimized(false)
    
    // Save permanently closed state
    if (userId) {
      const closedKey = getClosedKey(userId)
      localStorage.setItem(closedKey, JSON.stringify({ closed: true, timestamp: Date.now() }))
    }
  }, [userId])
  
  const resetTour = useCallback(() => {
    setCurrentStepIndex(0)
    setIsOpen(true)
    setIsMinimized(false)
    setPermanentlyClosed(false)
    setHasSeenTour(false)
    
    // Clear all onboarding storage for this user
    if (userId) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`mm_onboarding_${userId}`) || key === getClosedKey(userId)) {
          localStorage.removeItem(key)
        }
      })
    }
  }, [userId])
  
  const markPageCompleted = useCallback(() => {
    if (userId && pathname) {
      const pageKey = getStorageKey(userId, pathname)
      const state = {
        currentStepIndex: steps.length - 1,
        isMinimized: false,
        completed: true,
        dismissed: false,
        timestamp: Date.now(),
      }
      localStorage.setItem(pageKey, JSON.stringify(state))
    }
  }, [userId, pathname, steps.length])
  
  return (
    <OnboardingContext.Provider
      value={{
        steps,
        currentStepIndex,
        isOpen,
        isMinimized,
        permanentlyClosed,
        hasSeenTour,
        isFirstTime,
        startTour,
        nextStep,
        prevStep,
        closeTour,
        minimizeTour,
        openTour,
        closePermanently,
        resetTour,
        markPageCompleted,
        currentStep,
        isLastStep,
        isFirstStep,
        progress,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return ctx
}
