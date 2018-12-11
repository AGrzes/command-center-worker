import * as debug from 'debug'
import {readFile} from 'fs'
import * as yaml from 'js-yaml'
import * as _ from 'lodash'
import setUpSync from './controller/sync'
import { SyncConfig } from './model/sync'
import { configureDb } from './pouchdb'
import sync from './service/sync'
const log = debug('sync')

readFile('config/sync.yaml', 'UTF-8', (err, data) => {
  if (err) {
    log(err)
  } else {
    const config: SyncConfig[] = yaml.load(data)
    setUpSync(config, sync, configureDb)
  }
})
