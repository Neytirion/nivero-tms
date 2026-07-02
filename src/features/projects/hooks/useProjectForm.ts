import { useState } from 'react'

export function useProjectForm() {
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectCustomer, setProjectCustomer] = useState('')
  const [projectStartDate, setProjectStartDateState] = useState('')
  const [projectEndDate, setProjectEndDateState] = useState('')

  const setProjectStartDate = (value: string) => {
    setProjectStartDateState(value)

    setProjectEndDateState((previousEndDate) => {
      if (!previousEndDate || !value) {
        return previousEndDate
      }

      return previousEndDate < value ? value : previousEndDate
    })
  }

  const setProjectEndDate = (value: string) => {
    if (value && projectStartDate && value < projectStartDate) {
      setProjectEndDateState(projectStartDate)
      return
    }

    setProjectEndDateState(value)
  }

  const isDateRangeValid =
    !projectStartDate || !projectEndDate || projectEndDate >= projectStartDate

  const dateRangeError =
    projectStartDate && projectEndDate && projectEndDate < projectStartDate
      ? 'End date cannot be earlier than start date'
      : null

  const canSubmit =
    projectName.trim().length > 0 &&
    projectStartDate.trim().length > 0 &&
    projectEndDate.trim().length > 0 &&
    isDateRangeValid

  const reset = () => {
    setProjectName('')
    setProjectDescription('')
    setProjectCustomer('')
    setProjectStartDateState('')
    setProjectEndDateState('')
  }

  return {
    projectName,
    setProjectName,
    projectDescription,
    setProjectDescription,
    projectCustomer,
    setProjectCustomer,
    projectStartDate,
    setProjectStartDate,
    projectEndDate,
    setProjectEndDate,
    dateRangeError,
    canSubmit,
    reset,
  }
}
