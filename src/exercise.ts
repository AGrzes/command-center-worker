import * as debug from 'debug'
import {readFile} from 'fs'
import * as yaml from 'js-yaml'
import * as _ from 'lodash'
import { Ouch, override } from 'ouch-rx'
import { debounce, debounceTime, filter } from 'rxjs/operators'
import { WorkerStatus } from './model'
import PouchDB from './pouchdb'
import worker from './worker/changes-worker'
import { generateGoalReport, generateGoalReports, Goal } from './worker/exercise-goal-report'
import {ExerciseSession, ExerciseSessionConfig, issueToExerciseSession} from './worker/exercise-session-worker'

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
    worker('exercise-session', workerDb, ouchProgress, ouchExerciseSession,
      issueToExerciseSession(configs)).run().subscribe((progressItem) => {
        log('Transformed issue %O', progressItem)
      })
  }
})

ouchExerciseSession.changes({live: true}).pipe(debounceTime(1000))
  .subscribe(() => generateGoalReports(goalOuch, goalReportOuch, exerciseSessionPouch).subscribe(() => {
    log('Generated progress reports')
  }, log), log)

goalOuch.changes({include_docs: true, live: true}).pipe(filter((goal) => !goal.id.startsWith('_')))
  .subscribe((change) => generateGoalReport(change.doc, exerciseSessionPouch)
    .pipe(goalReportOuch.merge(override))
    .subscribe(() => {
      log('Generated progress reports based on %O', change)
    }, log),
  log)
