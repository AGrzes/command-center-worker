import * as pouchdbAdapterHttp from 'pouchdb-adapter-http'
import * as PouchDB from 'pouchdb-core'
import * as pouchdbMapReduce from 'pouchdb-mapreduce'
import * as pouchdbReplication from 'pouchdb-replication'
PouchDB.plugin(pouchdbReplication).plugin(pouchdbMapReduce).plugin(pouchdbAdapterHttp)
export default PouchDB
