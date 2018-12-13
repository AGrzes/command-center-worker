import { Ouch } from 'ouch-rx'
import { empty, Observable } from 'rxjs'
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

export function issueToExerciseSession(patterns: RegExp[]):
  (change: ProgressItem) => Observable<PouchDB.Core.Document<ExerciseSession>> {
  return (change: ProgressItem) => empty()
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
