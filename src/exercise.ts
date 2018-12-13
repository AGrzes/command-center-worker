import * as debug from 'debug'
import {readFile} from 'fs'
import * as yaml from 'js-yaml'
import * as _ from 'lodash'
import { Ouch } from 'ouch-rx'
import { WorkerStatus } from './model'
import PouchDB from './pouchdb'
import worker, {ExerciseSessionConfig, issueToExerciseSession} from './worker/exercise-session-worker'
const log = debug('exercise')
const workerDb = new PouchDB<WorkerStatus<string>>('http://couchdb.home.agrzes.pl:5984/worker')
const ouchProgress = new Ouch(new PouchDB('http://couchdb.home.agrzes.pl:5984/progress'))
const ouchExerciseSession = new Ouch(new PouchDB('http://couchdb.home.agrzes.pl:5984/exercise-session'))
readFile('config/exercise.yaml', 'UTF-8', (error, file) => {
  if (error) {
    log(error)
  } else {
    const configs: ExerciseSessionConfig[] = _.map(yaml.load(file),
      ({regExp, defaults}) => ({regExp: new RegExp(regExp), defaults}))
    worker(workerDb, ouchProgress, ouchExerciseSession,
      issueToExerciseSession(configs)).run().subscribe((progressItem) => {
        log('Transformed issue %O', progressItem)
      })
  }
})
