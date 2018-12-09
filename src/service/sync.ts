import * as debug from 'debug'
const log = debug('service:sync')
export default function sync(sourceDb: PouchDB.Database, targetDb: PouchDB.Database) {
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
}
