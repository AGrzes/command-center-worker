import * as debug from 'debug'
import { json, Router} from 'express'
import * as _ from 'lodash'
import { Ouch, override } from 'ouch-rx'
import * as PouchDB from 'pouchdb-http'
import {Subject} from 'rxjs'
import { map, debounceTime } from 'rxjs/operators'
import { ProgressItem, WorkerStatus } from './model'

type Issue = {key: string} & any

const log = debug('jira:pump')

const router = Router()
const ouchJira = new Ouch(new PouchDB('http://couchdb.home.agrzes.pl:5984/jira'))
const ouchProgress = new Ouch(new PouchDB('http://couchdb.home.agrzes.pl:5984/progress'))
const workerDb = new PouchDB<WorkerStatus>('http://couchdb.home.agrzes.pl:5984/worker')
const ouchWorker = new Ouch(workerDb)
const sink = new Subject<Issue>()
sink.pipe(map((issue) => {
  issue._id = issue.key
  return issue
}), ouchJira.merge(override)).subscribe({next(x) {
  log(`Processed change ${x}`)
}})
function push(issue: {key: string} & any) {
  sink.next(issue)
}

router.post('/hook', json(),  (req, res) => {
  const {webhookEvent, issue} = req.body
  switch (webhookEvent) {
    case 'jira:issue_deleted':
      push({key: issue.key})
      break
    case 'jira:issue_updated':
    case 'jira:issue_created':
      push(issue)
      break
  }
  res.send()
})

function issueToProgressItem(issue: any): PouchDB.Core.Document<ProgressItem> {
  return {
    summary: issue.fields.summary,
    status: issue.fields.status.name,
    defined: issue.fields.created,
    resolved: issue.fields.resolutiondate,
    labels: [
      'jira',
      issue.fields.issuetype.name,
      ...issue.fields.labels,
      ..._.map(issue.fields.customfield_10100, (value) => `action-type:${value}`),
      ..._.map(issue.fields.customfield_10101, (value) => `action-energy:${value}`),
      ..._.map(issue.fields.customfield_10102, (value) => `action-time:${value}`),
      ..._.map(issue.fields.customfield_10000, (value) => `action-context:${value}`)
    ],
    _id: `jira:${issue.key}`
  }
}

workerDb.get('jira-progress-item-pump')
  .catch((reason): PouchDB.Core.Document<WorkerStatus> => ({_id: 'jira-progress-item-pump'}))
  .then((workerStatus: PouchDB.Core.ExistingDocument<WorkerStatus>) => {
    const workerSubject = new Subject<PouchDB.Core.Document<WorkerStatus>>()
    workerSubject.pipe(debounceTime(1000), ouchWorker.merge(override)).subscribe((updated) => {
      log('Updated worker status %O', updated)
      workerStatus._rev = updated.rev
    })
    ouchJira.changes({include_docs: true, live: true, since: workerStatus.sequence })
    .pipe(map((change) => {
      workerStatus.sequence = change.seq
      return change.doc
    }), map(issueToProgressItem), ouchProgress.merge(override))
    .subscribe((progressItem) => {
      log('Transformed issue %O', progressItem)
      workerSubject.next(workerStatus)
    })
  })

export default router
