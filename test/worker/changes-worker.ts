import * as chai from 'chai'
import chaiSubset = require('chai-subset')
import 'mocha'
import { Observable } from 'rxjs'
import { toArray } from 'rxjs/operators'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import { ProgressItem } from '../../src/model'
import * as worker from '../../src/worker'
import * as exerciseSessionWorker from '../../src/worker/changes-worker'
chai.use(sinonChai).use(chaiSubset)
const expect = chai.expect
describe('worker', function() {
  describe('changes-worker', function() {
    describe('worker', function() {
      let workerConstructorSpy
      const workerDb: any = {}
      const changesMock = sinon.mock()
      const sourceOuch: any = {changes: changesMock}
      const ouchExerciseSession: any = {}
      const seq = 'seq'
      const data = {}
      const map: any = {}
      const progressKey = 'progressKey'
      before(function() {
        workerConstructorSpy = sinon.spy(worker, 'Worker')
      })

      beforeEach(function() {
        workerConstructorSpy.resetHistory()
        changesMock.reset()
      })
      after(function() {
        workerConstructorSpy.restore()
      })
      it('should create worker', function() {
        const instance = exerciseSessionWorker.default(progressKey, workerDb, sourceOuch, ouchExerciseSession, map)
        expect(instance).to.be.instanceOf(worker.Worker)
      })
      it('should initialize worker', function() {
        exerciseSessionWorker.default(progressKey, workerDb, sourceOuch, ouchExerciseSession, map)
        expect(workerConstructorSpy).to.be.calledOnceWith(workerDb, progressKey, sinon.match.func, '',
          map, sinon.match.func, ouchExerciseSession)
      })

      it('should use `change.seq` to measure progress', function() {
        exerciseSessionWorker.default(progressKey, workerDb, sourceOuch, ouchExerciseSession, map)
        const sequenceFunction: (item: {seq: string}) => string = workerConstructorSpy.firstCall.args[5]
        expect(sequenceFunction({seq})).to.be.equal(seq)
      })

      it('should use `changes` from `sourceOuch`', function() {
        exerciseSessionWorker.default(progressKey, workerDb, sourceOuch, ouchExerciseSession, map)
        const sourceFunction: (sequence: string) => Observable<any> = workerConstructorSpy.firstCall.args[2]
        changesMock.returns(data)
        expect(sourceFunction(seq)).to.be.equal(data)
        expect(changesMock).to.be.calledOnceWith({include_docs: true, live: true, since: seq })
      })
    })
  })
})
