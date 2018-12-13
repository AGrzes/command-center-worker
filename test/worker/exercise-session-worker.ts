import * as chai from 'chai'
import 'mocha'
import { Observable } from 'rxjs'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import * as worker from '../../src/worker'
import * as exerciseSessionWorker from '../../src/worker/exercise-session-worker'
chai.use(sinonChai)
const expect = chai.expect
describe('worker', function() {
  describe('exercise-session-worker', function() {
    describe('worker', function() {
      const workerConstructorSpy = sinon.spy(worker, 'Worker')
      const workerDb: any = {}
      const changesMock = sinon.mock()
      const ouchJira: any = {changes: changesMock}
      const ouchExerciseSession: any = {}
      const seq = 'seq'
      const data = {}
      const map: any = {}
      beforeEach(function() {
        workerConstructorSpy.resetHistory()
        changesMock.reset()
      })
      after(function() {
        workerConstructorSpy.restore()
      })
      it('should create worker', function() {
        const instance = exerciseSessionWorker.default(workerDb, ouchJira, ouchExerciseSession, map)
        expect(instance).to.be.instanceOf(worker.Worker)
      })
      it('should initialize worker', function() {
        exerciseSessionWorker.default(workerDb, ouchJira, ouchExerciseSession, map)
        expect(workerConstructorSpy).to.be.calledOnceWith(workerDb, 'exercise-session', sinon.match.func, '',
          map, sinon.match.func, ouchExerciseSession)
      })

      it('should use `change.seq` to measure progress', function() {
        exerciseSessionWorker.default(workerDb, ouchJira, ouchExerciseSession, map)
        const sequenceFunction: (item: {seq: string}) => string = workerConstructorSpy.firstCall.args[5]
        expect(sequenceFunction({seq})).to.be.equal(seq)
      })

      it('should use `changes` from `ouchJira`', function() {
        exerciseSessionWorker.default(workerDb, ouchJira, ouchExerciseSession, map)
        const sourceFunction: (sequence: string) => Observable<any> = workerConstructorSpy.firstCall.args[2]
        changesMock.returns(data)
        expect(sourceFunction(seq)).to.be.equal(data)
        expect(changesMock).to.be.calledOnceWith({include_docs: true, live: true, since: seq })
      })
    })
  })
})
