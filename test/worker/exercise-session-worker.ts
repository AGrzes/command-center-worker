import * as chai from 'chai'
import chaiSubset = require('chai-subset')
import 'mocha'
import { Observable } from 'rxjs'
import { toArray } from 'rxjs/operators'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import * as worker from '../../src/worker'
import * as exerciseSessionWorker from '../../src/worker/exercise-session-worker'
chai.use(sinonChai).use(chaiSubset)
const expect = chai.expect
describe('worker', function() {
  describe('exercise-session-worker', function() {
    describe('worker', function() {
      const workerConstructorSpy = sinon.spy(worker, 'Worker')
      const workerDb: any = {}
      const changesMock = sinon.mock()
      const sourceOuch: any = {changes: changesMock}
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
        const instance = exerciseSessionWorker.default(workerDb, sourceOuch, ouchExerciseSession, map)
        expect(instance).to.be.instanceOf(worker.Worker)
      })
      it('should initialize worker', function() {
        exerciseSessionWorker.default(workerDb, sourceOuch, ouchExerciseSession, map)
        expect(workerConstructorSpy).to.be.calledOnceWith(workerDb, 'exercise-session', sinon.match.func, '',
          map, sinon.match.func, ouchExerciseSession)
      })

      it('should use `change.seq` to measure progress', function() {
        exerciseSessionWorker.default(workerDb, sourceOuch, ouchExerciseSession, map)
        const sequenceFunction: (item: {seq: string}) => string = workerConstructorSpy.firstCall.args[5]
        expect(sequenceFunction({seq})).to.be.equal(seq)
      })

      it('should use `changes` from `ouchJira`', function() {
        exerciseSessionWorker.default(workerDb, sourceOuch, ouchExerciseSession, map)
        const sourceFunction: (sequence: string) => Observable<any> = workerConstructorSpy.firstCall.args[2]
        changesMock.returns(data)
        expect(sourceFunction(seq)).to.be.equal(data)
        expect(changesMock).to.be.calledOnceWith({include_docs: true, live: true, since: seq })
      })
    })
    describe('issueToExerciseSession', function() {
      it('should return empty observable when summary does not match any of patterns', function(done) {
        exerciseSessionWorker.issueToExerciseSession([])({
          _id: '_id',
          summary: 'Test',
          status: 'resolved'
        }).pipe(toArray()).subscribe((result) => {
          expect(result).to.be.empty
          done()
        }, done)
      })
      it('should return session if summary matches pattern', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /.*/, defaults: {}}])({
          _id: '_id',
          summary: 'Test',
          status: 'resolved',
          resolved: '2008-11-11'
        }).pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            date: '2008-11-11'
          }])
          done()
        }, done)
      })
      it('should use activity group to determine activity', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /(?<activity>.*)/, defaults: {}}])({
          _id: '_id',
          summary: 'Test',
          status: 'resolved',
          resolved: '2008-11-11'
        }).pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            activity: 'Test'
          }])
          done()
        }, done)
      })
      it('should use progress group to determine progress', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /(?<progress>.*)/, defaults: {}}])({
          _id: '_id',
          summary: '123.456',
          status: 'resolved',
          resolved: '2008-11-11'
        }).pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            progress: 123.456
          }])
          done()
        }, done)
      })
      it('should use unit group to determine unit', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /(?<unit>.*)/, defaults: {}}])({
          _id: '_id',
          summary: 'Test',
          status: 'resolved',
          resolved: '2008-11-11'
        }).pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            unit: 'Test'
          }])
          done()
        }, done)
      })
      it('should use first pattern that match', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /^$/, defaults: {}}, {regExp: /.*/, defaults: {}}])({
          _id: '_id',
          summary: 'Test',
          status: 'resolved',
          resolved: '2008-11-11'
        }).pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            date: '2008-11-11'
          }])
          done()
        }, done)
      })
      it('should use default activity group to determine activity', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /(.*)/, defaults: {activity: 'run'}}])({
          _id: '_id',
          summary: 'Test',
          status: 'resolved',
          resolved: '2008-11-11'
        }).pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            activity: 'run'
          }])
          done()
        }, done)
      })
    })
  })
})
