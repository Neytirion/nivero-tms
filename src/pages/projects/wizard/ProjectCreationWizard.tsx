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
const FLOW_STEPS: ProjectWizardStep[] = ['basic', 'dates', 'details', 'estimates', 'team', 'review']

interface ProjectCreationWizardProps {
  customerSuggestions: string[]
  currentUserEmail: string | null
  isLoading: boolean
  onCreateProject: (data: ProjectWizardData) => Promise<void>
  onSelectAI: () => void
}

export function ProjectCreationWizard({
  customerSuggestions,
  currentUserEmail,
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
    workPackages: [],
    pricePerHour: '',
    teamInvitations: [],
  })

  const hasDuplicateWorkPackageNames = useMemo(() => {
    const seenNames = new Set<string>()
    for (const workPackage of wizardData.workPackages) {
      const normalizedName = workPackage.name.trim().toLowerCase()
      if (!normalizedName) {
        continue
      }

      if (seenNames.has(normalizedName)) {
        return true
      }

      seenNames.add(normalizedName)
    }

    return false
  }, [wizardData.workPackages])

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
        return (
          wizardData.workPackages.every((pkg) => pkg.name.trim().length > 0) &&
          !hasDuplicateWorkPackageNames
        )
      case 'team':
        return true // Optional step
      case 'review':
        return true
      default:
        return false
    }
  }, [currentStep, hasDuplicateWorkPackageNames, wizardData])

  const handlePrevious = () => {
    const steps: ProjectWizardStep[] = ['choice', ...FLOW_STEPS]
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const handleNext = () => {
    const steps: ProjectWizardStep[] = ['choice', ...FLOW_STEPS]
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

  const handleSubmit = () => onCreateProject(wizardData)

  const handleDataChange = <K extends keyof ProjectWizardData>(
    key: K,
    value: ProjectWizardData[K],
  ) => {
    setWizardData((prev) => ({ ...prev, [key]: value }))
  }

  if (currentStep === 'choice') {
    return <CreationModeChoice onSelectMode={handleSelectMode} />
  }

  const currentStepNumber = FLOW_STEPS.indexOf(currentStep) + 1

  return (
    <div>
      <WizardHeader
        currentStep={currentStepNumber}
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
          onDescriptionChange={(value) => handleDataChange('projectDescription', value)}
        />
      )}

      {currentStep === 'estimates' && (
        <EstimatesStep
          workPackages={wizardData.workPackages}
          onWorkPackagesChange={(packages) => handleDataChange('workPackages', packages)}
          pricePerHour={wizardData.pricePerHour}
          onPricePerHourChange={(value) => handleDataChange('pricePerHour', value)}
        />
      )}

      {currentStep === 'team' && (
        <TeamStep
          currentUserEmail={currentUserEmail}
          teamInvitations={wizardData.teamInvitations}
          onTeamInvitationsChange={(invitations) => handleDataChange('teamInvitations', invitations)}
        />
      )}

      {currentStep === 'review' && (
        <ReviewStep data={wizardData} />
      )}

      <WizardNavigation
        currentStep={currentStepNumber}
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
