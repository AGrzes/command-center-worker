import { Ouch } from 'ouch-rx'
import { Observable } from 'rxjs'
import { WorkerStatus } from '../model'
import { Worker } from '../worker'

export default function worker<S, D>(progressKey: string, workerDb: PouchDB.Database<WorkerStatus<string>>,
                                     sourceOuch: Ouch<any>,
                                     destinationOuch: Ouch<any>,
                                     mapFunction: (item: any) => Observable<D & PouchDB.Core.IdMeta>):
  Worker<any, string, D> {
  return new Worker(workerDb, progressKey,
  (sequence) => sourceOuch.changes<any>({include_docs: true, live: true, since: sequence }), '',
  mapFunction, (change) => change.seq, destinationOuch)
}
