'use client'

import { useOnboarding, EsponjaGuia } from './index'

export default function OnboardingUI() {
  const {
    steps,
    currentStepIndex,
    isOpen,
    isMinimized,
    permanentlyClosed,
    nextStep,
    prevStep,
    closeTour,
    minimizeTour,
    openTour,
    closePermanently,
  } = useOnboarding()
  
  if (steps.length === 0) return null
  
  return (
    <EsponjaGuia
      steps={steps}
      currentStepIndex={currentStepIndex}
      isOpen={isOpen}
      isMinimized={isMinimized}
      permanentlyClosed={permanentlyClosed}
      onNext={nextStep}
      onPrev={prevStep}
      onClose={closeTour}
      onMinimize={minimizeTour}
      onOpen={openTour}
      onClosePermanently={closePermanently}
    />
  )
}
