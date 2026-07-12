/**
 * Types mirroring the reporting API. The `config` shapes here are the same
 * declarative definitions the Laravel ReportCompiler validates and runs.
 */

export type ReportType = 'detail' | 'summary' | 'matrix'

export type FieldRole = 'dimension' | 'measure'

export type DataType = 'string' | 'integer' | 'decimal' | 'date'

export type Aggregation = 'sum' | 'avg' | 'min' | 'max' | 'count'

export type Operator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'contains'
  | 'starts_with'
  | 'in'
  | 'between'

export interface Field {
  key: string
  label: string
  type: FieldRole
  data_type: DataType
  aggregations: Aggregation[]
  operators: Operator[]
  format: string | null
}

export interface DataSource {
  key: string
  label: string
  description: string | null
  fields: Field[]
}

export interface Measure {
  field: string
  agg: Aggregation
}

export interface Filter {
  field: string
  operator: Operator
  value: string | number | Array<string | number>
}

export interface Sort {
  field: string
  direction: 'asc' | 'desc'
}

export interface ReportConfig {
  columns?: string[]
  group_by?: string[]
  measures?: Measure[]
  row?: string
  column?: string
  measure?: Measure
  filters?: Filter[]
  sort?: Sort[]
  limit?: number
}

export interface ReportDefinition {
  data_source: string
  type: ReportType
  config: ReportConfig
}

export interface SavedReport extends ReportDefinition {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

// --- Result shapes ------------------------------------------------------

export interface ResultColumn {
  key: string
  label: string
  type?: FieldRole
  data_type?: DataType
  format?: string | null
  aggregation?: Aggregation
}

export interface TableResult {
  type: 'detail' | 'summary'
  columns: ResultColumn[]
  rows: Array<Record<string, string | number | null>>
  meta: {
    row_count: number
    truncated?: boolean
    limit?: number
    group_by?: string[]
    totals?: Record<string, number>
  }
}

export interface MatrixRow {
  row_value: string
  cells: Record<string, number>
  total: number
}

export interface MatrixResult {
  type: 'matrix'
  row: ResultColumn
  column: ResultColumn
  measure: ResultColumn
  column_values: string[]
  rows: MatrixRow[]
  column_totals: Record<string, number>
  grand_total: number
  meta: { row_count: number }
}

export type ReportResult = TableResult | MatrixResult
