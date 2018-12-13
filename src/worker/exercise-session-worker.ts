import * as _ from 'lodash'
import { Ouch } from 'ouch-rx'
import { empty, Observable, of } from 'rxjs'
import { ProgressItem, WorkerStatus } from '../model'
import { Worker } from '../worker'
type Activity = 'run' | 'pool' | 'crunches' | 'bike'
type Unit = 'session' | 'm' | 'km'
export interface ExerciseSession {
  activity: Activity
  date: string
  progress?: number
  unit?: Unit
}

export interface ExerciseSessionConfig {
  regExp: RegExp,
  defaults: {
    activity?: Activity
    progress?: number
    unit?: Unit
  }

}

export function issueToExerciseSession(configs: ExerciseSessionConfig[]):
  (change: PouchDB.Core.Document<ProgressItem>) => Observable<PouchDB.Core.Document<ExerciseSession>> {
  return (change: PouchDB.Core.Document<ProgressItem>) => {
    return _(configs).map((config) => {
      const match = config.regExp.exec(change.summary)
      if (match) {
        const activity: Activity = match.groups && match.groups.activity as Activity || config.defaults.activity
        const progress: number = match.groups && match.groups.progress ?
          Number.parseFloat(match.groups.progress) : config.defaults.progress || 1
        const unit: Unit = match.groups && match.groups.unit as Unit || config.defaults.unit || 'session'
        return of({
          _id: change._id,
          activity,
          progress,
          unit,
          date: change.resolved
        })
      } else {
        return null
      }
    }).filter().first() || empty()
  }
}

export default function worker(workerDb: PouchDB.Database<WorkerStatus<string>>,
                               sourceOuch: Ouch<any>,
                               ouchExerciseSession: Ouch<any>,
                               mapFunction: (item: any) => Observable<ExerciseSession & PouchDB.Core.IdMeta>):
                               Worker<any, string, ExerciseSession> {
  return new Worker(workerDb, 'exercise-session',
  (sequence) => sourceOuch.changes<any>({include_docs: true, live: true, since: sequence }), '',
  mapFunction, (change) => change.seq, ouchExerciseSession)
}
