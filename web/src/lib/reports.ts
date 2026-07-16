import { api } from './api'
import type {
  DataSource,
  ExportFormat,
  ReportDefinition,
  ReportResult,
  ReportSchedule,
  ReportShare,
  SavedReport,
  ScheduleFrequency,
} from '../types/reports'

/** Reporting metadata — data sources and their fields. */
export async function fetchDataSources(): Promise<DataSource[]> {
  const { data } = await api.get<{ data: DataSource[] }>('/data-sources')
  return data.data
}

/** Run an ad-hoc definition (live preview, nothing saved). */
export async function runReport(def: ReportDefinition): Promise<ReportResult> {
  const { data } = await api.post<{ data: ReportResult }>('/reports/run', def)
  return data.data
}

/** List the current user's saved reports. */
export async function fetchReports(): Promise<SavedReport[]> {
  const { data } = await api.get<{ data: SavedReport[] }>('/reports')
  return data.data
}

export async function fetchReport(id: number): Promise<SavedReport> {
  const { data } = await api.get<{ data: SavedReport }>(`/reports/${id}`)
  return data.data
}

export interface SaveReportInput extends ReportDefinition {
  name: string
  description?: string | null
}

export async function createReport(input: SaveReportInput): Promise<SavedReport> {
  const { data } = await api.post<{ data: SavedReport }>('/reports', input)
  return data.data
}

export async function updateReport(
  id: number,
  input: SaveReportInput,
): Promise<SavedReport> {
  const { data } = await api.put<{ data: SavedReport }>(`/reports/${id}`, input)
  return data.data
}

export async function deleteReport(id: number): Promise<void> {
  await api.delete(`/reports/${id}`)
}

// --- Export -------------------------------------------------------------

/** Trigger a browser download of the current file blob. */
function saveBlob(blob: Blob, fallbackName: string, headerName?: string | null) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = headerName ?? fallbackName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function filenameFromHeaders(headers: Record<string, unknown>): string | null {
  const disposition = String(headers['content-disposition'] ?? '')
  const match = disposition.match(/filename=([^;]+)/i)
  return match ? match[1].trim().replace(/["']/g, '') : null
}

/** Export an ad-hoc definition (the live preview) in the given format. */
export async function exportRun(def: ReportDefinition, format: ExportFormat, name: string): Promise<void> {
  const res = await api.post('/reports/run/export', { ...def, format, name }, { responseType: 'blob' })
  saveBlob(res.data as Blob, `${name || 'report'}.${format}`, filenameFromHeaders(res.headers as Record<string, unknown>))
}

/** Export a saved report in the given format. */
export async function exportSaved(id: number, format: ExportFormat, name: string): Promise<void> {
  const res = await api.get(`/reports/${id}/export`, { params: { format }, responseType: 'blob' })
  saveBlob(res.data as Blob, `${name || 'report'}.${format}`, filenameFromHeaders(res.headers as Record<string, unknown>))
}

// --- Sharing ------------------------------------------------------------

export async function fetchShares(reportId: number): Promise<ReportShare[]> {
  const { data } = await api.get<{ data: ReportShare[] }>(`/reports/${reportId}/shares`)
  return data.data
}

export async function addShare(
  reportId: number,
  email: string,
  permission: 'view' | 'edit',
): Promise<ReportShare> {
  const { data } = await api.post<{ data: ReportShare }>(`/reports/${reportId}/shares`, { email, permission })
  return data.data
}

export async function removeShare(reportId: number, userId: number): Promise<void> {
  await api.delete(`/reports/${reportId}/shares/${userId}`)
}

// --- Scheduling ---------------------------------------------------------

export interface ScheduleInput {
  frequency: ScheduleFrequency
  format: ExportFormat
  hour: number
  recipients: string[]
  is_active?: boolean
}

export async function fetchSchedules(reportId: number): Promise<ReportSchedule[]> {
  const { data } = await api.get<{ data: ReportSchedule[] }>(`/reports/${reportId}/schedules`)
  return data.data
}

export async function createSchedule(reportId: number, input: ScheduleInput): Promise<ReportSchedule> {
  const { data } = await api.post<{ data: ReportSchedule }>(`/reports/${reportId}/schedules`, input)
  return data.data
}

export async function deleteSchedule(scheduleId: number): Promise<void> {
  await api.delete(`/schedules/${scheduleId}`)
}

export interface DeliveryResult {
  status: string
  file_path: string | null
  bytes: number | null
  message: string
}

export async function runScheduleNow(scheduleId: number): Promise<DeliveryResult> {
  const { data } = await api.post<{ data: DeliveryResult }>(`/schedules/${scheduleId}/run`)
  return data.data
}
