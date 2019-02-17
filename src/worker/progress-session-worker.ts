import * as _ from 'lodash'
import { empty, Observable, of } from 'rxjs'
import { ProgressItem } from '../model'
export type Activity = 'run' | 'pool' | 'crunches' | 'bike' | string
export type Unit = 'session' | 'm' | 'km' | 'page' | string
export interface ProgressSession {
  activity: Activity
  date: string
  progress?: number
  unit?: Unit
}

export interface ProgressSessionConfig {
  regExp?: RegExp,
  labels?: string[],
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
      if (config.regExp) {
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
        }
      }
      if (config.labels) {
        if (_.intersection(change.doc.labels, config.labels).length) {
          const activity: Activity =  config.defaults.activity
          const progress: number = config.defaults.progress || 1
          const unit: Unit = config.defaults.unit || 'session'
          return of({
            _id: change.id,
            activity,
            progress,
            unit,
            date: change.doc.resolved
          })
        }
      }
      return null
    }).filter().first() || empty()
  }
}
