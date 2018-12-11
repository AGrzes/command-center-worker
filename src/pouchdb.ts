import {Agent} from 'https'
import fetch, { Request } from 'node-fetch'
import * as pouchdbAdapterHttp from 'pouchdb-adapter-http'
import * as PouchDB from 'pouchdb-core'
import * as pouchdbMapReduce from 'pouchdb-mapreduce'
import * as pouchdbReplication from 'pouchdb-replication'
import { DbConfig } from './model/pouchdb'
PouchDB.plugin(pouchdbReplication).plugin(pouchdbMapReduce).plugin(pouchdbAdapterHttp)
export default PouchDB

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
