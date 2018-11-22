import * as pouchdbAdapterHttp from 'pouchdb-adapter-http'
import * as PouchDB from 'pouchdb-core'
import * as pouchdbReplication from 'pouchdb-replication'
PouchDB.plugin(pouchdbReplication).plugin(pouchdbAdapterHttp)
export default PouchDB
