import * as debug from 'debug'
import { MergeFunction, Ouch, override } from 'ouch-rx'
import { Observable, OperatorFunction, Subject } from 'rxjs'
import { concatMap, tap, throttleTime } from 'rxjs/operators'
import { WorkerStatus } from './model'
import './pouchdb'
const log = debug('worker')

export class BaseWorker<K extends object, S, T> {
  private ouchWorker: Ouch<WorkerStatus<S>>

  constructor(private workerDb: PouchDB.Database<WorkerStatus<S>>, private workerId: string,
              private source: (sequence: S) => Observable<K>,
              private initialSequence: S,
              private mapFunction: (item: K) => Observable<T & PouchDB.Core.IdMeta>,
              private sequenceFunction: (item: K) => S,
              private operation: OperatorFunction<T, PouchDB.Core.ExistingDocument<T>>) {
    this.ouchWorker = new Ouch(workerDb)
  }

  public run(): Observable<any> {
    return new Observable((subscriber) => {
      this.workerDb.get(this.workerId)
      .catch((): PouchDB.Core.Document<WorkerStatus<S>> => ({_id: this.workerId, sequence: this.initialSequence}))
      .then((workerStatus: PouchDB.Core.ExistingDocument<WorkerStatus<S>>) => {
        const workerSubject = new Subject<PouchDB.Core.Document<WorkerStatus<S>>>()
        workerSubject.pipe(throttleTime(1000), this.ouchWorker.merge(override)).subscribe((updated) => {
          log('Updated worker status %O', updated)
          workerStatus._rev = updated.rev
        }, (error) => log('Failed to update worker status %O', error))
        try {
          this.source(workerStatus.sequence)
          .pipe(tap((issue) => {
            const nextSequence = this.sequenceFunction(issue)
            if (nextSequence > workerStatus.sequence) {
              workerStatus.sequence = nextSequence
              workerSubject.next(workerStatus)
            }
          }), concatMap( this.mapFunction), this.operation)
          .subscribe({complete() {
            workerSubject.next(workerStatus)
            subscriber.complete()
          }, error(error) {
            log('Worker error %O', error)
            subscriber.error(error)
          }})
        } catch (error) {
          log('Worker error %O', error)
          subscriber.error(error)
        }
      })
    })

  }
}

export class Worker<K extends object, S, T> extends BaseWorker<K, S, T> {
  constructor(workerDb: PouchDB.Database<WorkerStatus<S>>, workerId: string,
              source: (sequence: S) => Observable<K>,
              initialSequence: S,
              mapFunction: (item: K) => Observable<T & PouchDB.Core.IdMeta>,
              sequenceFunction: (item: K) => S,
              sink: Ouch<K>,
              mergeFunction: MergeFunction<T & PouchDB.Core.IdMeta, any> = override) {
    super(workerDb, workerId, source, initialSequence, mapFunction, sequenceFunction, sink.merge(mergeFunction))
  }
}
