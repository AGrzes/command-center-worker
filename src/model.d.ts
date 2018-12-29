export interface Category {
  name: string
  parent?: Category
}

export interface Related {
  relation: string
  target: {
    id: string
    summary?: string
  }

}

export interface ProgressItem {
  summary: string // Textual description of the item
  defined?: string // date time of item definition
  resolved?: string // date time of item resolution
  labels?: string[] // set of additional classification information
  status: 'defined' | 'resolved' // item status
  categories?: Category[] // item categories
  related?: Related[]
  details?: string
}

export interface WorkerStatus<S> {
  sequence?: S
}
