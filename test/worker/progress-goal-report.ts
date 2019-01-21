import * as chai from 'chai'
import chaiSubset = require('chai-subset')
import 'mocha'
import { of } from 'rxjs'
import { toArray } from 'rxjs/operators'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import * as progressGoalReport from '../../src/worker/progress-goal-report'
import { ProgressSession } from '../../src/worker/progress-session-worker'
chai.use(sinonChai).use(chaiSubset)
const expect = chai.expect
describe('worker', function() {
  describe('progress-goal-report', function() {
    const goal: PouchDB.Core.ExistingDocument<progressGoalReport.Goal> = {
      activity: 'run',
      archived: false,
      startDate: '2000-01-01',
      dueDate: '2001-01-01',
      target: 100,
      unit: 'km',
      meet: true,
      _id: 'id',
      _rev: 'rev'
    }
    const response: PouchDB.Query.Response<ProgressSession> = {
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
    describe('calculateProgress', function() {
      it('should copy goal attributes except `_rev`', function() {
        expect(progressGoalReport.calculateProgress(goal, response))
          .to.containSubset(Object.assign({}, goal, {_rev: undefined}))
      })
      it('should calculate increments and total', function() {
        expect(progressGoalReport.calculateProgress(goal, response))
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
        expect(progressGoalReport.calculateProgress(goal, response))
          .not.to.containSubset({progress: [{
            date: '2000-01-03'
          }]})
      })
    })
    describe('normalizeValue', function() {
      it('should convert `m` to `km`', function() {
        expect(progressGoalReport.normalizeValue(1000, 'm', 'km')).to.be.equals(1)
      })
      it('should convert `km` to `km`', function() {
        expect(progressGoalReport.normalizeValue(1000, 'km', 'km')).to.be.equals(1000)
      })
      it('should not convert `session` to `km`', function() {
        expect(progressGoalReport.normalizeValue(1000, 'session', 'km')).to.be.null
      })
      it('should convert `m` to `m`', function() {
        expect(progressGoalReport.normalizeValue(1000, 'm', 'm')).to.be.equals(1000)
      })
      it('should convert `km` to `m`', function() {
        expect(progressGoalReport.normalizeValue(1, 'km', 'm')).to.be.equals(1000)
      })
      it('should not convert `session` to `m`', function() {
        expect(progressGoalReport.normalizeValue(1000, 'session', 'm')).to.be.null
      })
      it('should convert `m` to `session`', function() {
        expect(progressGoalReport.normalizeValue(1000, 'm', 'session')).to.be.equals(1)
      })
      it('should convert `km` to `session`', function() {
        expect(progressGoalReport.normalizeValue(1000, 'km', 'session')).to.be.equals(1)
      })
      it('should convert `session` to `session`', function() {
        expect(progressGoalReport.normalizeValue(1000, 'session', 'session')).to.be.equals(1000)
      })
      it('should convert `session` to `other`', function() {
        expect(progressGoalReport.normalizeValue(1000, 'session', 'other')).to.be.null
      })
    })
    describe('generateGoalReport', function() {
      let calculateProgressSpy: sinon.SinonSpy
      before(function() {
        calculateProgressSpy = sinon.spy(progressGoalReport, 'calculateProgress')
      })
      beforeEach(function() {
        calculateProgressSpy.resetHistory()
      })
      after(function() {
        calculateProgressSpy.restore()
      })

      it('should call `sessionDb.query`', function() {
        const sessionDb: any = {
          query: sinon.mock().resolves(response)
        }
        progressGoalReport.generateGoalReport(goal, sessionDb)
        expect(sessionDb.query).to.be.calledWith('index/activity-date', {
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
        })
      })
    })
    describe('generateGoalReports', function() {
      it('should save goal report', function(done) {
        const goalOuch: any = {
          all: () => of(goal)
        }
        const sinkMock = sinon.mock()
        const goalReportOuch: any = {
          merge: sinon.mock().returns(sinkMock)
        }
        const sessionDb: any = {
          query: sinon.mock().resolves(response)
        }
        progressGoalReport.generateGoalReports(goalOuch, goalReportOuch, sessionDb)
        expect(goalReportOuch.merge).to.be.calledOnce
        expect(sinkMock).to.be.calledOnce
        sinkMock.firstCall.args[0].pipe(toArray()).subscribe((result) => {
          expect(result)
          .to.containSubset([Object.assign({}, goal, {_rev: undefined})])
          done()
        }, done)
      })
    })
  })
})
