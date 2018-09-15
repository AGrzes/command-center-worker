import * as debug from 'debug'
import { json, Router} from 'express'
import { Ouch, override } from 'ouch-rx'
import * as PouchDB from 'pouchdb-http'
import {Subject} from 'rxjs'
import { map } from 'rxjs/operators'
import { ProgressItem } from './model'

type Issue = {key: string} & any

const log = debug('jira:pump')

const router = Router()
const ouchJira = new Ouch(new PouchDB('http://couchdb.home.agrzes.pl:5984/jira'))
const ouchProgress = new Ouch(new PouchDB('http://couchdb.home.agrzes.pl:5984/progress'))
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
    _id: `jira:${issue.key}`
  }
}
ouchJira.changes({include_docs: true, live: true}).pipe(map(issueToProgressItem), ouchProgress.merge(override))
  .subscribe((progressItem) => log(progressItem))
export default router
