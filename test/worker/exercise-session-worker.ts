import * as chai from 'chai'
import chaiSubset = require('chai-subset')
import 'mocha'
import { toArray } from 'rxjs/operators'
import * as sinonChai from 'sinon-chai'
import { ProgressItem } from '../../src/model'
import * as exerciseSessionWorker from '../../src/worker/exercise-session-worker'
chai.use(sinonChai).use(chaiSubset)
const expect = chai.expect
describe('worker', function() {
  describe('exercise-session-worker', function() {
    describe('issueToExerciseSession', function() {
      const change: PouchDB.Core.ChangesResponseChange<ProgressItem> = {
        id: '_id',
        seq: 0,
        changes: [],
        doc: {
          _id: '_id',
          summary: 'Test',
          status: 'resolved',
          resolved: '2008-11-11'
        } as any
      }
      it('should return empty observable when summary does not match any of patterns', function(done) {
        exerciseSessionWorker.issueToExerciseSession([])(change).pipe(toArray()).subscribe((result) => {
          expect(result).to.be.empty
          done()
        }, done)
      })
      it('should return session if summary matches pattern', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /.*/, defaults: {}}])(change)
        .pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            date: '2008-11-11'
          }])
          done()
        }, done)
      })
      it('should use activity group to determine activity', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /(?<activity>.*)/, defaults: {}}])(change)
        .pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            activity: 'Test'
          }])
          done()
        }, done)
      })
      it('should use progress group to determine progress', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /(?<progress>.*)/, defaults: {}}])({
          id: '_id',
          seq: 0,
          changes: [],
          doc: {
            _id: '_id',
            summary: '123.456',
            status: 'resolved',
            resolved: '2008-11-11'
          } as any
        })
        .pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            progress: 123.456
          }])
          done()
        }, done)
      })
      it('should use unit group to determine unit', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /(?<unit>.*)/, defaults: {}}])(change)
        .pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            unit: 'Test'
          }])
          done()
        }, done)
      })
      it('should use first pattern that match', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /^$/, defaults: {}}, {regExp: /.*/, defaults: {}}])
        (change).pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            date: '2008-11-11'
          }])
          done()
        }, done)
      })
      it('should use default activity to determine activity', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /(.*)/, defaults: {activity: 'run'}}])(change)
        .pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            activity: 'run'
          }])
          done()
        }, done)
      })
      it('should use default progress to determine progress', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /(.*)/, defaults: {progress: 1}}])(change)
        .pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            progress: 1
          }])
          done()
        }, done)
      })
      it('should default progress to 1', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /(.*)/, defaults: {}}])(change)
        .pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            progress: 1
          }])
          done()
        }, done)
      })
      it('should use default unit to determine unit', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /(.*)/, defaults: {unit: 'session'}}])(change)
        .pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            unit: 'session'
          }])
          done()
        }, done)
      })
      it('should default unit `session`', function(done) {
        exerciseSessionWorker.issueToExerciseSession([{regExp: /(.*)/, defaults: {}}])(change)
        .pipe(toArray()).subscribe((result) => {
          expect(result).to.containSubset([{
            unit: 'session'
          }])
          done()
        }, done)
      })
    })
  })
})
