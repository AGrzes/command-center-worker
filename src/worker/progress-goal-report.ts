import * as _ from 'lodash'
import { Ouch, override } from 'ouch-rx'
import { from, Observable } from 'rxjs'
import { filter, flatMap } from 'rxjs/operators'
import { Activity, ProgressSession, Unit } from './progress-session-worker'

export interface Goal {
  activity: Activity
  startDate: string
  dueDate: string
  target: number
  unit?: Unit
  archived: boolean
  meet?: boolean
}

interface ProgressItem {
  date: string
  increment: number
  total: number
}

interface GoalReport extends Goal {
  progress: ProgressItem[]
}

export function normalizeValue(value: number, valueUnit: Unit, targetUnit: Unit) {
  switch (targetUnit) {
    case 'm':
      switch (valueUnit) {
        case 'm': return value
        case 'km': return value * 1000
        default: return null
      }
    case 'km':
      switch (valueUnit) {
        case 'm': return value / 1000
        case 'km': return value
        default: return null
      }
    case 'session': switch (valueUnit) {
      case 'session': return value
      default: return 1
    }
    default: if (valueUnit === targetUnit) {
      return value
    } else {
      return null
    }
  }
}

export function calculateProgress(goal: PouchDB.Core.Document<Goal>,
                                  response: PouchDB.Query.Response<ProgressSession>):
  PouchDB.Core.Document<GoalReport> {
  const progress: ProgressItem[] = []
  let lastDate = null
  let progressItem: ProgressItem = null
  let total = 0
  for (const row of response.rows) {
    const date = row.doc.date.substring(0, 10)
    const increment = normalizeValue(row.doc.progress, row.doc.unit, goal.unit)
    if (increment) {
      if (date !== lastDate) {
        lastDate = date
        total += increment
        progressItem = {
          date,
          increment,
          total
        }
        progress.push(progressItem)
      } else {
        total += increment
        progressItem.total = total
        progressItem.increment += increment
      }
    }
  }
  return Object.assign({ progress}, goal, {_rev: undefined})
}

export function generateGoalReport(goal: PouchDB.Core.Document<Goal>, sessionDb: PouchDB.Database<ProgressSession> ):
  Observable<PouchDB.Core.Document<GoalReport>> {
  return from(
  sessionDb.query<ProgressSession>('index/activity-date', {
    include_docs: true,
    startkey: [
      goal.activity,
      goal.startDate.substring(0, 4),
      goal.startDate.substring(5, 7),
      goal.startDate.substring(8, 10)
    ],
    endkey: [
      goal.activity,
      goal.dueDate.substring(0, 4),
      goal.dueDate.substring(5, 7),
      goal.dueDate.substring(8, 10)
    ],
    inclusive_end: true
  }).then((response) => calculateProgress(goal, response)))
}

export function generateGoalReports(goalOuch: Ouch<Goal>,
                                    goalReportOuch: Ouch<GoalReport>,
                                    sessionDb: PouchDB.Database<ProgressSession> ): Observable<any> {
  return goalOuch.all().pipe(filter((goal) => !goal._id.startsWith('_')), flatMap((goal) => {
    return generateGoalReport(goal, sessionDb)
  }), goalReportOuch.merge(override))
}
