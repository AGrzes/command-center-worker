import * as debug from 'debug'
import {readFile} from 'fs'
import * as yaml from 'js-yaml'
import * as _ from 'lodash'
import { Ouch } from 'ouch-rx'
import { empty } from 'rxjs'
import { debounceTime, filter } from 'rxjs/operators'
import { WorkerStatus } from './model'
import PouchDB, { setUpViews } from './pouchdb'
import {BaseWorker, Worker} from './worker'
import changesWorker from './worker/changes-worker'
import { generateGoalReport, generateGoalReports, Goal } from './worker/progress-goal-report'
import {issueToProgressSession, ProgressSession, ProgressSessionConfig} from './worker/progress-session-worker'

const log = debug('progress-report')
const workerDb = new PouchDB<WorkerStatus<string>>('http://admin:admin@couchdb.home.agrzes.pl:5984/worker')
const ouchProgress = new Ouch(new PouchDB('http://admin:admin@couchdb.home.agrzes.pl:5984/progress'))
const progressSessionPouch = new PouchDB<ProgressSession>('http://admin:admin@couchdb.home.agrzes.pl:5984/progress-session')
const ouchProgressSession = new Ouch(progressSessionPouch)
const goalOuch = new Ouch<Goal>(new PouchDB('http://admin:admin@couchdb.home.agrzes.pl:5984/progress-goal'))
const goalReportOuch = new Ouch(new PouchDB('http://admin:admin@couchdb.home.agrzes.pl:5984/progress-goal-report'))

setUpViews(progressSessionPouch, {
  _id: '_design/index',
  version: '1.0.0',
  views: {
    'activity-date': {
      map: `
function (doc) {
  emit([
    doc.activity,
    doc.date.substring(0, 4),
    doc.date.substring(5, 7),
    doc.date.substring(8, 10)
  ]);
}
      `
    }
  },
  language: 'javascript'
})

readFile('config/progress-session.yaml', 'UTF-8', (error, file) => {
  if (error) {
    log(error)
  } else {
    const configs: ProgressSessionConfig[] = _.map(yaml.load(file),
      ({regExp, labels, defaults}) => ({regExp: regExp ? new RegExp(regExp) : null, labels, defaults}))
    changesWorker('progress-session', workerDb, ouchProgress, ouchProgressSession,
      issueToProgressSession(configs)).run().subscribe((progressItem) => {
        log('Transformed issue %O', progressItem)
      })
  }
})

const reportsWorker = new BaseWorker<any, string, any>(workerDb,
  'progress-session-progress-report',
  (sequence) => ouchProgressSession.changes({live: true, since: sequence}).pipe(debounceTime(1000)),
  '',
  () => generateGoalReports(goalOuch, goalReportOuch, progressSessionPouch),
  (change) => change.seq, _.identity)

reportsWorker.run().subscribe(() => {
  log('Generated progress reports')
}, log)

const reportWorker = new Worker<any, string, any>(workerDb,
  'progress-goal-progress-report',
  (sequence) => goalOuch.changes({include_docs: true, live: true, since: sequence})
    .pipe(filter((goal) => !goal.id.startsWith('_'))),
  '',
  (change) => !change.deleted ? generateGoalReport(change.doc, progressSessionPouch) : empty(),
  (change) => change.seq, goalReportOuch)

reportWorker.run().subscribe((change) => {
  log('Generated progress reports based on %O', change)
}, log)
