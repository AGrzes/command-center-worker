import * as debug from 'debug'
import loadConfig from './config/sync'
import setUpSync from './controller/sync'
import { configureDb } from './pouchdb'
import sync from './service/sync'
const log = debug('sync')

loadConfig('config/sync.yaml')
  .then((config) => setUpSync(config, sync, configureDb))
  .catch(log)
