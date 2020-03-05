import * as confluenceClient from 'confluence-client'
import * as debug from 'debug'
import * as _ from 'lodash'
import { Ouch } from 'ouch-rx'
import { Observable, Observer, of } from 'rxjs'
import { WorkerStatus } from './model'
import PouchDB from './pouchdb'
import { Worker } from './worker'
const log = debug('confluence:pump')
const confluence = confluenceClient({
  username: process.env.CONFLUENCE_USER,
  password: process.env.CONFLUENCE_PASSWORD,
  endpoint: process.env.CONFLUENCE_ENDPOINT
})

interface Reminder {
  name: string
  content: string
  lastUpdated: string
}

function fetch(since?: string): Observable<Reminder>  {
  return Observable.create((observer: Observer<Reminder>) => {
      confluence.search('label in (reminder)', ['body.export_view', 'history.lastUpdated'])
      .then((response) => {
        response.results.forEach((result) => observer.next({
          name: result.title,
          content: _.get(result, 'body.export_view.value'),
          lastUpdated: _.get(result, 'history.lastUpdated.when')
        }))
      }).catch((e) => observer.error(e))
  })
}

const ouchReminders = new Ouch(new PouchDB('http://couchdb.home.agrzes.pl:5984/reminders'))
const workerDb = new PouchDB<WorkerStatus<string>>('http://couchdb.home.agrzes.pl:5984/worker')
const ouchProgress = new Ouch(new PouchDB('http://couchdb.home.agrzes.pl:5984/progress'))

const confluenceRemindersMirrorWorker = new Worker<Reminder, string, Reminder>(workerDb,
  'confluence-reminders-couchdb-item-pump',
  fetch, '',
  (issue) => of({...issue, _id: _.kebabCase(issue.name)}), (issue) => issue.lastUpdated, ouchReminders)

confluenceRemindersMirrorWorker.run().subscribe({
  complete() {
    log('scheduled run complete')
  }, error(error) {
    log(`scheduled run failed with ${error}`)
  }
})
