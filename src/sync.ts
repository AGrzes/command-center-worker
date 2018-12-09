import * as debug from 'debug'
import {readFile} from 'fs'
import * as yaml from 'js-yaml'
import * as _ from 'lodash'
import { configureDb, DbConfig } from './pouchdb'
import sync from './service/sync'
const log = debug('sync')

interface SyncConfig {
  from: DbConfig
  to: DbConfig
}

readFile('config/sync.yaml', 'UTF-8', (err, data) => {
  if (err) {
    log(err)
  } else {
    const config: SyncConfig[] = yaml.load(data)
    _.forEach(config, (item) => sync(configureDb(item.from), configureDb(item.to)))
  }
})
