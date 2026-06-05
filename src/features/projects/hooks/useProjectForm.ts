import { useState } from 'react'

export function useProjectForm() {
  const [projectName, setProjectName] = useState('')
  const [projectCustomer, setProjectCustomer] = useState('')
  const [projectStartDate, setProjectStartDate] = useState('')
  const [projectEndDate, setProjectEndDate] = useState('')

  const canSubmit =
    projectName.trim().length > 0 &&
    projectStartDate.trim().length > 0 &&
    projectEndDate.trim().length > 0

  const reset = () => {
    setProjectName('')
    setProjectCustomer('')
    setProjectStartDate('')
    setProjectEndDate('')
  }

  return {
    projectName,
    setProjectName,
    projectCustomer,
    setProjectCustomer,
    projectStartDate,
    setProjectStartDate,
    projectEndDate,
    setProjectEndDate,
    canSubmit,
    reset,
  }
}
