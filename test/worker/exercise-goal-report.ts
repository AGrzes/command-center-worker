import * as chai from 'chai'
import chaiSubset = require('chai-subset')
import 'mocha'
import { toArray } from 'rxjs/operators'
import * as sinonChai from 'sinon-chai'
import { ProgressItem } from '../../src/model'
import * as exerciseGoalReport from '../../src/worker/exercise-goal-report'
import { ExerciseSession } from '../../src/worker/exercise-session-worker'
chai.use(sinonChai).use(chaiSubset)
const expect = chai.expect
describe('worker', function() {
  describe('exercise-goal-report', function() {
    describe('issueToExerciseSession', function() {
      const response: PouchDB.Query.Response<ExerciseSession> = {
        offset: 0,
        total_rows: 3,
        rows: [{
          id: 'id',
          key: [],
          doc: {
            _id: 'id',
            _rev: null,
            date: '2000-01-01',
            activity: 'run',
            progress: 1000,
            unit: 'm'
          },
          value: null
        }, {
          id: 'id',
          key: [],
          doc: {
            _id: 'id',
            _rev: null,
            date: '2000-01-01',
            activity: 'run',
            progress: 1,
            unit: 'km'
          },
          value: null
        }, {
          id: 'id',
          key: [],
          doc: {
            _id: 'id',
            _rev: null,
            date: '2000-01-02',
            activity: 'run',
            progress: 1000,
            unit: 'm'
          },
          value: null
        }, {
          id: 'id',
          key: [],
          doc: {
            _id: 'id',
            _rev: null,
            date: '2000-01-03',
            activity: 'run',
            progress: 1000,
            unit: 'session'
          },
          value: null
        }]
      }
      const goal: PouchDB.Core.ExistingDocument<exerciseGoalReport.Goal> = {
        activity: 'run',
        archived: false,
        startDate: '2000-01-01',
        dueDate: '2001-01-01',
        target: 100,
        unit: 'km',
        meet: true,
        _id: '_id',
        _rev: '_rev'
      }
      it('should copy goal attributes except `_rev`', function() {
        expect(exerciseGoalReport.calculateProgress(goal, response))
          .to.containSubset(Object.assign({}, goal, {_rev: undefined}))
      })
      it('should calculate increments and total', function() {
        expect(exerciseGoalReport.calculateProgress(goal, response))
          .to.containSubset({progress: [{
            date: '2000-01-01',
            increment: 2,
            total: 2
          }, {
            date: '2000-01-02',
            increment: 1,
            total: 3
          }]})
      })
      it('should ignore items that can be converted to correct unit', function() {
        expect(exerciseGoalReport.calculateProgress(goal, response))
          .not.to.containSubset({progress: [{
            date: '2000-01-03'
          }]})
      })
    })
  })
})
