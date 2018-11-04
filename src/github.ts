import axios from 'axios'
import * as debug from 'debug'
import { json, Router } from 'express'
import {parse as parseLinkHeader, Reference} from 'http-link-header'
import { Ouch, override } from 'ouch-rx'
import * as PouchDB from 'pouchdb-http'
import {Observable, Observer, Subject} from 'rxjs'
import { debounceTime, map, tap } from 'rxjs/operators'
import { WorkerStatus } from './model'
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
        const links = parseLinkHeader(response.headers.link)
        const next: Reference = links.rel('next')[0]
        if (next) {
          doFetch(next.uri)
        } else {
          observer.complete()
        }
      })
    }
    const url = new URL('https://api.github.com/issues')
    url.searchParams.set('filter', 'all')
    if (options.since) {
      url.searchParams.set('since', options.since)
    }
    doFetch(url.toString())
  })

}
const ouchGithub = new Ouch(new PouchDB('http://couchdb.home.agrzes.pl:5984/github'))
const workerDb = new PouchDB<WorkerStatus>('http://couchdb.home.agrzes.pl:5984/worker')
const ouchWorker = new Ouch(workerDb)
const router = Router()
router.post('/fetch', json(),  (req, res) => {
  workerDb.get('github-progress-item-pump')
  .catch((reason): PouchDB.Core.Document<WorkerStatus> => ({_id: 'github-progress-item-pump'}))
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
    }})
  })
})
export default router
