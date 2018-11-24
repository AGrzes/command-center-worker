import axios from 'axios'
import { CronJob } from 'cron'
import * as debug from 'debug'
import { json, Router } from 'express'
import {parse as parseLinkHeader, Reference} from 'http-link-header'
import * as _ from 'lodash'
import { Ouch, override } from 'ouch-rx'
import {empty, Observable, Observer, of, Subject} from 'rxjs'
import { debounceTime, flatMap, map, tap } from 'rxjs/operators'
import { URL } from 'url'
import { inspect } from 'util'
import { ProgressItem, WorkerStatus } from './model'
import PouchDB from './pouchdb'
import { Worker } from './worker'
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
const workerDb = new PouchDB<WorkerStatus<string | number>>('http://couchdb.home.agrzes.pl:5984/worker')
const ouchProgress = new Ouch(new PouchDB('http://couchdb.home.agrzes.pl:5984/progress'))
const ouchWorker = new Ouch(workerDb)
const router = Router()

const githubMirrorWorker = new Worker(workerDb, 'github-couchdb-item-pump',
  (since: string) => fetch({token, since}), '',
  (issue) => of({...issue, _id: issue.id.toString()}), (issue) => issue.updated_at, ouchGithub)

router.post('/fetch', (req, res) => {
    githubMirrorWorker
  .run().subscribe({
      complete() {
        res.send()
      }, error(error) {
        res.status(500).send(inspect(error))
      }
    })
})

new CronJob('0 33 * * * *', () => {
  log('scheduled run started')
  githubMirrorWorker.run().subscribe({
    complete() {
      log('scheduled run complete')
    }, error(error) {
      log(`scheduled run failed with ${error}`)
    }
  })
}).start()

function issueToProgressItem(change: any): Observable<PouchDB.Core.Document<ProgressItem>> {
  if (change.doc) {
    const issue = change.doc
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
  } else {
    return empty()
  }
}

const githubProgressWorker = new Worker(workerDb, 'github-progress-item-pump',
  (sequence) => ouchGithub.changes<any>({include_docs: true, live: true, since: sequence }), '',
  issueToProgressItem, (change) => change.seq, ouchProgress)

githubProgressWorker.run().subscribe((progressItem) => {
  log('Transformed issue %O', progressItem)
})
export default router
