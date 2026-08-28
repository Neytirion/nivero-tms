import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { utils, writeFile } from 'xlsx'
import type { TimeEntryReport } from '../types/reports'
import { hoursToDisplay } from './reports.utils'

interface ExportData {
  date: string
  member: string
  project: string
  client: string
  duration: string
  type: string
}

function prepareExportData(entries: TimeEntryReport[]): ExportData[] {
  return entries.map((entry) => ({
    date: new Date(entry.entryDate).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    member: entry.memberName,
    project: entry.projectName,
    client: entry.clientName || '-',
    duration: hoursToDisplay(entry.minutesSpent / 60),
    type: entry.isBillable ? 'Billable' : 'Non-billable',
  }))
}

export function exportToCSV(entries: TimeEntryReport[]) {
  const data = prepareExportData(entries)
  const headers = ['Date', 'Member', 'Project', 'Client', 'Duration', 'Type']
  
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      [row.date, row.member, row.project, row.client, row.duration, row.type].map((cell) => `"${cell}"`).join(',')
    ),
  ].join('\n')

  downloadFile(csv, 'time-entries.csv', 'text/csv')
}

export function exportToXLSX(entries: TimeEntryReport[]) {
  const data = prepareExportData(entries)
  const headers = ['Date', 'Member', 'Project', 'Client', 'Duration', 'Type']
  
  const ws = utils.json_to_sheet(data, { header: headers })
  
  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Date
    { wch: 18 }, // Member
    { wch: 20 }, // Project
    { wch: 20 }, // Client
    { wch: 12 }, // Duration
    { wch: 14 }, // Type
  ]

  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Time Entries')
  
  writeFile(wb, 'time-entries.xlsx')
}

export function exportToPDF(entries: TimeEntryReport[]) {
  const data = prepareExportData(entries)
  
  const doc = new jsPDF()
  const title = 'Time Tracking Report'
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Add title
  doc.setFontSize(16)
  doc.text(title, 14, 15)
  
  // Add generated date
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated on ${generatedDate}`, 14, 22)
  
  // Reset text color for table
  doc.setTextColor(0, 0, 0)

  // Add table
  autoTable(doc, {
    head: [['Date', 'Member', 'Project', 'Client', 'Duration', 'Type']],
    body: data.map((row) => [row.date, row.member, row.project, row.client, row.duration, row.type]),
    startY: 30,
    margin: { top: 30, right: 14, bottom: 14, left: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [55, 65, 81],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 11,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [0, 0, 0],
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      4: { halign: 'right' },
    },
  })

  doc.save('time-entries.pdf')
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
