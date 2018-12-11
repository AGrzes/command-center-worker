import * as _ from 'lodash'
import { DbConfig } from '../pouchdb'
import { SyncConfig } from '../sync'

export default function setUpSync(config: SyncConfig[],
                                  sync: (from: PouchDB.Database, to: PouchDB.Database) => void,
                                  configureDb: (config: DbConfig) => PouchDB.Database) {
  _.forEach(config, (item) => sync(configureDb(item.from), configureDb(item.to)))
}
