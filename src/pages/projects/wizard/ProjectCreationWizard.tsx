import { useMemo, useState } from 'react'
import type { ProjectWizardData, ProjectWizardStep } from './types'
import { WizardHeader } from './WizardHeader'
import { WizardNavigation } from './WizardNavigation'
import { CreationModeChoice } from './CreationModeChoice'
import { BasicInfoStep } from './BasicInfoStep'
import { DateRangeStep } from './DateRangeStep'
import { DetailsStep } from './DetailsStep'
import { EstimatesStep } from './EstimatesStep'
import { TeamStep } from './TeamStep'
import { ReviewStep } from './ReviewStep'

const STEP_NAMES = ['Name & Company', 'Timeline', 'Details', 'Estimates', 'Team', 'Review']

interface ProjectCreationWizardProps {
  customerSuggestions: string[]
  isLoading: boolean
  onCreateProject: (data: ProjectWizardData) => Promise<void>
  onSelectAI: () => void
}

export function ProjectCreationWizard({
  customerSuggestions,
  isLoading,
  onCreateProject,
  onSelectAI,
}: ProjectCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState<ProjectWizardStep>('choice')
  const [wizardData, setWizardData] = useState<ProjectWizardData>({
    projectName: '',
    companyName: '',
    projectStartDate: '',
    projectEndDate: '',
    projectDescription: '',
    projectBudgetAmount: '',
    useEstimates: false,
    workPackages: [],
    teamInvitations: [],
  })

  // Validation logic
  const canGoToNextStep = useMemo(() => {
    switch (currentStep) {
      case 'choice':
        return true
      case 'basic':
        return wizardData.projectName.trim().length > 0
      case 'dates':
        return (
          wizardData.projectStartDate.length > 0 &&
          wizardData.projectEndDate.length > 0 &&
          wizardData.projectEndDate >= wizardData.projectStartDate
        )
      case 'details':
        return true // Optional step
      case 'estimates':
        // If estimates enabled, validate all packages have names
        if (wizardData.useEstimates) {
          return wizardData.workPackages.every((pkg) => pkg.name.trim().length > 0)
        }
        return true
      case 'team':
        return true // Optional step
      case 'review':
        return true
      default:
        return false
    }
  }, [currentStep, wizardData])

  const handlePrevious = () => {
    const steps: ProjectWizardStep[] = ['choice', 'basic', 'dates', 'details', 'estimates', 'team', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const handleNext = () => {
    const steps: ProjectWizardStep[] = ['choice', 'basic', 'dates', 'details', 'estimates', 'team', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const handleSelectMode = (mode: 'manual' | 'ai') => {
    if (mode === 'ai') {
      onSelectAI()
    } else {
      setCurrentStep('basic')
    }
  }

  const handleSubmit = async () => {
    try {
      await onCreateProject(wizardData)
    } catch (error) {
      // Error handling is done in parent component
      throw error
    }
  }

  const handleDataChange = <K extends keyof ProjectWizardData>(
    key: K,
    value: ProjectWizardData[K],
  ) => {
    setWizardData((prev) => ({ ...prev, [key]: value }))
  }

  if (currentStep === 'choice') {
    return <CreationModeChoice onSelectMode={handleSelectMode} />
  }

  return (
    <div>
      <WizardHeader
        currentStep={Object.values(['basic', 'dates', 'details', 'estimates', 'team', 'review']).indexOf(currentStep as any) + 1}
        totalSteps={6}
        stepNames={STEP_NAMES}
      />

      {/* Step Content */}
      {currentStep === 'basic' && (
        <BasicInfoStep
          projectName={wizardData.projectName}
          companyName={wizardData.companyName}
          customerSuggestions={customerSuggestions}
          onProjectNameChange={(value) => handleDataChange('projectName', value)}
          onCompanyNameChange={(value) => handleDataChange('companyName', value)}
        />
      )}

      {currentStep === 'dates' && (
        <DateRangeStep
          projectStartDate={wizardData.projectStartDate}
          projectEndDate={wizardData.projectEndDate}
          onStartDateChange={(value) => handleDataChange('projectStartDate', value)}
          onEndDateChange={(value) => handleDataChange('projectEndDate', value)}
        />
      )}

      {currentStep === 'details' && (
        <DetailsStep
          projectDescription={wizardData.projectDescription}
          projectBudgetAmount={wizardData.projectBudgetAmount}
          onDescriptionChange={(value) => handleDataChange('projectDescription', value)}
          onBudgetChange={(value) => handleDataChange('projectBudgetAmount', value)}
        />
      )}

      {currentStep === 'estimates' && (
        <EstimatesStep
          useEstimates={wizardData.useEstimates}
          workPackages={wizardData.workPackages}
          onUseEstimatesChange={(value) => handleDataChange('useEstimates', value)}
          onWorkPackagesChange={(packages) => handleDataChange('workPackages', packages)}
        />
      )}

      {currentStep === 'team' && (
        <TeamStep
          teamInvitations={wizardData.teamInvitations}
          onTeamInvitationsChange={(invitations) => handleDataChange('teamInvitations', invitations)}
        />
      )}

      {currentStep === 'review' && (
        <ReviewStep data={wizardData} />
      )}

      <WizardNavigation
        currentStep={Object.values(['basic', 'dates', 'details', 'estimates', 'team', 'review']).indexOf(currentStep as any) + 1}
        totalSteps={6}
        isLoading={isLoading}
        canGoNext={canGoToNextStep}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
