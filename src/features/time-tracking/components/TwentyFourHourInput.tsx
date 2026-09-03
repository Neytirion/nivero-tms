import { forwardRef } from 'react'

interface TwentyFourHourInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  id?: string
  'aria-label'?: string
  onBlur?: () => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

function formatTimeInput(value: string) {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

export const TwentyFourHourInput = forwardRef<HTMLInputElement, TwentyFourHourInputProps>(function TwentyFourHourInput({
  value,
  onChange,
  disabled,
  className,
  id,
  'aria-label': ariaLabel,
  onBlur,
  onKeyDown,
}, ref) {
  return (
    <input
      ref={ref}
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-2][0-9]:[0-5][0-9]"
      maxLength={5}
      placeholder="HH:MM"
      value={value}
      onChange={(event) => onChange(formatTimeInput(event.target.value))}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
    />
  )
})
