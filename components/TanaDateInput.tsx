'use client'

import React from 'react'

export type TanaDateInputProps = {
  value: string
  onChange: (v: string) => void
  id?: string
  name?: string
  min?: string
  max?: string
  disabled?: boolean
  placeholder?: string
  className?: string
}

export default function TanaDateInput({
  value,
  onChange,
  id,
  name,
  min,
  max,
  disabled,
  placeholder = '請選擇日期',
  className = ''
}: TanaDateInputProps) {
  return (
    <input
      id={id}
      name={name}
      type="date"
      className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}
