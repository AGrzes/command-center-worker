import axios from 'axios'
import * as debug from 'debug'
import { json, Router } from 'express'
import {parse as parseLinkHeader, Reference} from 'http-link-header'
import * as _ from 'lodash'
import { Ouch, override } from 'ouch-rx'
import * as PouchDB from 'pouchdb-http'
import {empty, Observable, Observer, of, Subject} from 'rxjs'
import { debounceTime, flatMap, map, tap } from 'rxjs/operators'
import { ProgressItem, WorkerStatus } from './model'
const log = debug('github:pump')
interface FetchOptions {
  token: string
  since?: string
}

const token = process.env.GIT_HUB_TOKEN

function fetch(options: FetchOptions): Observable<any> {
  return Observable.create((observer: Observer<any>) => {
    const doFetch = (address: string) => {
      axios.get(address, {
        headers: {
          authorization: `token ${options.token}`
        }
      }).then((response) => {
        response.data.forEach((issue) => {
          observer.next(issue)
        })
        const links = parseLinkHeader(response.headers.link || '')
        const next: Reference = links.rel('next')[0]
        if (next) {
          doFetch(next.uri)
        } else {
          observer.complete()
        }
      }).catch((error) => observer.error(error))
    }
    const url = new URL('https://api.github.com/issues')
    url.searchParams.set('filter', 'all')
    url.searchParams.set('state', 'all')
    if (options.since) {
      url.searchParams.set('since', options.since)
    }
    doFetch(url.toString())
  })

}
const ouchGithub = new Ouch(new PouchDB('http://couchdb.home.agrzes.pl:5984/github'))
const workerDb = new PouchDB<WorkerStatus>('http://couchdb.home.agrzes.pl:5984/worker')
const ouchProgress = new Ouch(new PouchDB('http://couchdb.home.agrzes.pl:5984/progress'))
const ouchWorker = new Ouch(workerDb)
const router = Router()
router.post('/fetch', json(),  (req, res) => {
  workerDb.get('github-couchdb-item-pump')
  .catch((): PouchDB.Core.Document<WorkerStatus> => ({_id: 'github-couchdb-item-pump', sequence: ''}))
  .then((workerStatus: PouchDB.Core.ExistingDocument<WorkerStatus>) => {
    fetch({token , since: workerStatus.sequence as string})
    .pipe(tap((issue) => {
      if (issue.updated_at > workerStatus.sequence) {
        workerStatus.sequence = issue.updated_at
      }
    }), map((issue) => ({...issue, _id: issue.id.toString()})), ouchGithub.merge(override))
    .subscribe({complete() {
      workerDb.put(workerStatus)
      res.send()
    }, error(error) {
      res.status(500).send(error)
    }})
  })
})

function issueToProgressItem(issue: any): Observable<PouchDB.Core.Document<ProgressItem>> {
  return of({
    summary: issue.title,
    details: issue.body,
    status: issue.state,
    defined: issue.created_at,
    resolved: issue.closed_at,
    labels: [
      'github',
      `repository:${issue.repository.name}`,
      ..._.compact([issue.milestone ? `milestone:${issue.milestone.name}` : null]),
      ..._.map(issue.labels, (label) => `label:${label.name}`)
    ],
    _id: `github:${issue.id}`
  })
}

workerDb.get('github-progress-item-pump')
  .catch((): PouchDB.Core.Document<WorkerStatus> => ({_id: 'github-progress-item-pump'}))
  .then((workerStatus: PouchDB.Core.ExistingDocument<WorkerStatus>) => {
    const workerSubject = new Subject<PouchDB.Core.Document<WorkerStatus>>()
    workerSubject.pipe(debounceTime(1000), ouchWorker.merge(override)).subscribe((updated) => {
      log('Updated worker status %O', updated)
      workerStatus._rev = updated.rev
    })
    log('Initiating github-progress-item-pump %O', workerStatus)
    ouchGithub.changes<any>({include_docs: true, live: true, since: workerStatus.sequence })
    .pipe(flatMap((change) => {
      workerStatus.sequence = change.seq
      if (change.doc) {
        return of(change.doc)
      } else {
        return empty()
      }
    }), flatMap(issueToProgressItem), ouchProgress.merge(override))
    .subscribe((progressItem) => {
      log('Transformed issue %O', progressItem)
      workerSubject.next(workerStatus)
    })
  })
export default router
