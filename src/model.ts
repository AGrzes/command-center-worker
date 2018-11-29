export interface Category {
  name: string
  parent?: Category
}

export interface ProgressItem {
  summary: string // Textual description of the item
  defined?: string // date time of item definition
  resolved?: string // date time of item resolution
  labels?: string[] // set of additional classification information
  status: 'defined' | 'resolved' // item status
  categories?: Category[] // item categories
  details?: string
}

export interface WorkerStatus<S> {
  sequence?: S
}
