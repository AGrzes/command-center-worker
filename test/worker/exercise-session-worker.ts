import * as chai from 'chai'
import 'mocha'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import PouchDB from '../../src/pouchdb'
import { Worker } from '../../src/worker'
import * as worker from '../../src/worker/exercise-session-worker'
chai.use(sinonChai)
const expect = chai.expect
describe('worker', function() {
  describe('exercise-session-worker', function() {
    it('should create worker', function() {
      const workerDb: any = {}
      const ouchJira: any = {}
      const ouchExerciseSession: any = {}
      const instance = worker.default(workerDb, ouchJira, ouchExerciseSession)
      expect(instance).to.be.instanceOf(Worker)
    })
  })
})
