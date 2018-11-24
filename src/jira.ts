import {JiraClient} from '@agrzes/jira-adapter'
import axios from 'axios'
import { CronJob } from 'cron'
import * as debug from 'debug'
import { json, Router} from 'express'
import * as _ from 'lodash'
import moment = require('moment')
import { Ouch, override } from 'ouch-rx'
import {empty, Observable, of, Subject} from 'rxjs'
import { debounceTime, flatMap, map, tap, throttleTime } from 'rxjs/operators'
import { ProgressItem, WorkerStatus } from './model'
import PouchDB from './pouchdb'
import { Worker } from './worker'
type Issue = {key: string} & any

const log = debug('jira:pump')

const router = Router()
const jiraDb = new PouchDB('http://couchdb.home.agrzes.pl:5984/jira')
const ouchJira = new Ouch(jiraDb)
const ouchProgress = new Ouch(new PouchDB('http://couchdb.home.agrzes.pl:5984/progress'))
const workerDb = new PouchDB<WorkerStatus<string | number>>('http://couchdb.home.agrzes.pl:5984/worker')
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

const jiraClinet = new JiraClient(axios.create({
  baseURL: process.env.JIRA_URL,
  auth: {
    username: process.env.JIRA_USERNAME,
    password: process.env.JIRA_PASSWORD
  }
}))

function fetch(updated?: string): Observable<any> {
  if (updated) {
    return jiraClinet.query(`updated >= '${moment(updated).format('YYYY-MM-DD HH:mm')}' order by updated asc`)
  } else {
    return jiraClinet.query('order by updated asc')
  }
}

const jiraMirrorWorker = new Worker(workerDb, 'jira-couchdb-item-pump', fetch, '',
  (issue) => of({...issue, _id: issue.key}), (issue) => issue.fields.updated, ouchJira)

router.post('/fetch', (req, res) => {
    jiraMirrorWorker.run().subscribe({
      complete() {
        res.send()
      }, error(error) {
        res.status(500).send(error)
      }
    })
})

new CronJob('0 21 * * * *', () => {
  log('scheduled run started')
  jiraMirrorWorker.run().subscribe({
    complete() {
      log('scheduled run complete')
    }, error(error) {
      log(`scheduled run failed with ${error}`)
    }
  })
}).start()

function issueToProgressItem(change: any): Observable<PouchDB.Core.Document<ProgressItem>> {
  if (change.doc && change.doc.fields) {
    const issue = change.doc
    return of({
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
    })
  } else {
    return empty()
  }
}

const jiraProgressWorker = new Worker(workerDb, 'jira-progress-item-pump',
  (sequence) => ouchJira.changes<any>({include_docs: true, live: true, since: sequence }), '',
  issueToProgressItem, (change) => change.seq, ouchProgress)

jiraProgressWorker.run().subscribe((progressItem) => {
  log('Transformed issue %O', progressItem)
})

export default router
