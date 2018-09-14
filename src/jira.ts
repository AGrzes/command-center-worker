import { json, Router} from 'express'
import { Ouch, override } from 'ouch-rx'
import * as PouchDB from 'pouchdb-http'
import {Subject} from 'rxjs'
import { map } from 'rxjs/operators'

type Issue = {key: string} & any

const router = Router()
const db = new PouchDB('http://couchdb.home.agrzes.pl:5984/jira')
const ouch = new Ouch(db)
const sink = new Subject<Issue>()
sink.pipe(map((issue) => {
  issue._id = issue.key
  return issue
}), ouch.merge(override)).subscribe({next(x) {
  console.log(`Processed change ${x}`)
  //
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
export default router
