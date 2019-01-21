import * as _ from 'lodash'
import { Ouch } from 'ouch-rx'
import { empty, Observable, of } from 'rxjs'
import { ProgressItem, WorkerStatus } from '../model'
import { Worker } from '../worker'
export type Activity = 'run' | 'pool' | 'crunches' | 'bike'
export type Unit = 'session' | 'm' | 'km'
export interface ProgressSession {
  activity: Activity
  date: string
  progress?: number
  unit?: Unit
}

export interface ProgressSessionConfig {
  regExp: RegExp,
  defaults: {
    activity?: Activity
    progress?: number
    unit?: Unit
  }

}

export function issueToProgressSession(configs: ProgressSessionConfig[]):
  (change: PouchDB.Core.ChangesResponseChange<ProgressItem>) => Observable<PouchDB.Core.Document<ProgressSession>> {
  return (change: PouchDB.Core.ChangesResponseChange<ProgressItem>) => {
    return _(configs).map((config) => {
      const match = config.regExp.exec(change.doc.summary)
      if (match) {
        const activity: Activity = match.groups && match.groups.activity as Activity || config.defaults.activity
        const progress: number = match.groups && match.groups.progress ?
          Number.parseFloat(match.groups.progress) : config.defaults.progress || 1
        const unit: Unit = match.groups && match.groups.unit as Unit || config.defaults.unit || 'session'
        return of({
          _id: change.id,
          activity,
          progress,
          unit,
          date: change.doc.resolved
        })
      } else {
        return null
      }
    }).filter().first() || empty()
  }
}
