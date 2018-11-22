import * as debug from 'debug'
import {readFile} from 'fs'
import {Agent} from 'https'
import * as yaml from 'js-yaml'
import * as _ from 'lodash'
import fetch, { Request } from 'node-fetch'
import PouchDB from './pouchdb'
const log = debug('sync')
interface ServerConfig {
  url: string,
  key?: string
  cert?: string
}

interface DbConfig {
  server: ServerConfig
  name: string
}

interface SyncConfig {
  from: DbConfig
  to: DbConfig
}

function configureDb<X>(config: DbConfig): PouchDB.Database<X> {
  const dbOptions: PouchDB.Configuration.RemoteDatabaseConfiguration = {}
  if (config.server.key || config.server.cert) {
    const agent = new Agent({
      key: config.server.key,
      cert: config.server.cert
    })
    dbOptions.fetch = (url: string | Request, options) => {
      return fetch(url, { ...options,
        agent
      })
    }
  }
  return new PouchDB(`${config.server.url}/${config.name}`, dbOptions)
}

readFile('config/sync.yaml', 'UTF-8', (err, data) => {
  if (err) {
    log(err)
  } else {
    const config: SyncConfig[] = yaml.load(data)
    _.forEach(config, (item) => {
      const sourceDb = configureDb(item.from)
      const targetDb = configureDb(item.to)
      sourceDb.replicate.to(targetDb, {live: true, retry: true})
      .on('change', (change) => {
        log(`change ${change}`)
      }).on('paused',  (info) => {
        log(`paused ${info}`)
      }).on('active', () => {
        log(`active`)
      }).on('error', (error) => {
        log(`error ${error}`)
      })
    })
  }
})
