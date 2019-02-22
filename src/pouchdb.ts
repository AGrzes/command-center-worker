import * as debug from 'debug'
import {Agent} from 'https'
import fetch, { Request } from 'node-fetch'
import { merge } from 'ouch-rx'
import * as pouchdbAdapterHttp from 'pouchdb-adapter-http'
import * as PouchDB from 'pouchdb-core'
import * as pouchdbMapReduce from 'pouchdb-mapreduce'
import * as pouchdbReplication from 'pouchdb-replication'
import { of } from 'rxjs'
import { DbConfig } from './model/pouchdb'
PouchDB.plugin(pouchdbReplication).plugin(pouchdbMapReduce).plugin(pouchdbAdapterHttp)
export default PouchDB
const log = debug('pouchdb:db')
export function configureDb<X>(config: DbConfig): PouchDB.Database<X> {
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

function updateVersion<T extends object>(newDoc: T & {version: string},
                                         oldDoc?: T & {version: string} & {_rev: string}): any {
  if (oldDoc) {
    if (oldDoc.version === newDoc.version) {
      log('Version exist')
      return null
    } else {
      log('Updating version')
      return {...newDoc, _rev: oldDoc._rev}
    }
  } else {
    return newDoc
  }
}

export function setUpViews<T extends object>(db: PouchDB.Database<T>, ...views: any[]) {
  of(...views).pipe(merge(db, updateVersion)).subscribe({
    complete() {
      log('views initialized')
    },
    error(e) {
      log('Error initializing views: %O', e)
    }
  })
}
