import {readFile} from 'fs'
import * as yaml from 'js-yaml'
import { SyncConfig } from '../model/sync'

export default function loadConfig(configPath: string): Promise<SyncConfig[]> {
  return new Promise((resolve, reject) => {
    readFile(configPath, 'UTF-8', (err, data) => {
      if (err) {
        reject(err)
      } else {
        const config: SyncConfig[] = yaml.load(data)
        resolve(config)
      }
    })
  })
}
