import * as debug from 'debug'
import {readFile} from 'fs'
import * as yaml from 'js-yaml'
import * as _ from 'lodash'
import { Ouch, override } from 'ouch-rx'
import { debounce, debounceTime, filter } from 'rxjs/operators'
import { WorkerStatus } from './model'
import PouchDB from './pouchdb'
import {BaseWorker, Worker} from './worker'
import changesWorker from './worker/changes-worker'
import { generateGoalReport, generateGoalReports, Goal } from './worker/exercise-goal-report'
import {ExerciseSession, ExerciseSessionConfig, issueToExerciseSession} from './worker/exercise-session-worker'
import { empty } from 'rxjs';

const log = debug('exercise')
const workerDb = new PouchDB<WorkerStatus<string>>('http://couchdb.home.agrzes.pl:5984/worker')
const ouchProgress = new Ouch(new PouchDB('http://couchdb.home.agrzes.pl:5984/progress'))
const exerciseSessionPouch = new PouchDB<ExerciseSession>('http://couchdb.home.agrzes.pl:5984/exercise-session')
const ouchExerciseSession = new Ouch(exerciseSessionPouch)
const goalOuch = new Ouch<Goal>(new PouchDB('http://couchdb.home.agrzes.pl:5984/exercise-goal'))
const goalReportOuch = new Ouch(new PouchDB('http://couchdb.home.agrzes.pl:5984/exercise-goal-report'))
readFile('config/exercise.yaml', 'UTF-8', (error, file) => {
  if (error) {
    log(error)
  } else {
    const configs: ExerciseSessionConfig[] = _.map(yaml.load(file),
      ({regExp, defaults}) => ({regExp: new RegExp(regExp), defaults}))
    changesWorker('exercise-session', workerDb, ouchProgress, ouchExerciseSession,
      issueToExerciseSession(configs)).run().subscribe((progressItem) => {
        log('Transformed issue %O', progressItem)
      })
  }
})

const reportsWorker = new BaseWorker<any, string, any>(workerDb,
  'exercise-session-progress-report',
  (sequence) => ouchExerciseSession.changes({live: true, since: sequence}).pipe(debounceTime(1000)),
  '',
  () => generateGoalReports(goalOuch, goalReportOuch, exerciseSessionPouch),
  (change) => change.seq, _.identity)

reportsWorker.run().subscribe(() => {
  log('Generated progress reports')
}, log)

const reportWorker = new Worker<any, string, any>(workerDb,
  'exercise-goal-progress-report',
  (sequence) => goalOuch.changes({include_docs: true, live: true, since: sequence})
    .pipe(filter((goal) => !goal.id.startsWith('_'))),
  '',
  (change) => !change.deleted ? generateGoalReport(change.doc, exerciseSessionPouch) : empty(),
  (change) => change.seq, goalReportOuch)

reportWorker.run().subscribe((change) => {
  log('Generated progress reports based on %O', change)
}, log)
