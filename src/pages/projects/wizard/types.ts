export type ProjectWizardStep = 'choice' | 'basic' | 'dates' | 'details' | 'estimates' | 'team' | 'review'

export type WorkPackageRow = {
  name: string
  estimatedHours: string
}

export type TeamInvitation = {
  email: string
  role: 'member' | 'manager' | 'admin'
}

export type ProjectWizardData = {
  // Step 1: Basic info
  projectName: string
  companyName: string

  // Step 2: Dates
  projectStartDate: string
  projectEndDate: string

  // Step 3: Details (optional)
  projectDescription: string
  projectBudgetAmount: string

  // Step 4: Estimates (optional)
  useEstimates: boolean
  workPackages: WorkPackageRow[]

  // Step 5: Team (optional)
  teamInvitations: TeamInvitation[]
}
