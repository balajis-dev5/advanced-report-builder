import { api } from './api'
import type {
  DataSource,
  ReportDefinition,
  ReportResult,
  SavedReport,
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
