import { DbConfig } from '../pouchdb'

export interface SyncConfig {
  from: DbConfig
  to: DbConfig
}
