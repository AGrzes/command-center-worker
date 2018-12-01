import * as chai from 'chai'
import * as _ from 'lodash'
import 'mocha'
import { Ouch } from 'ouch-rx'
import * as pouchdbAdapterMemory from 'pouchdb-adapter-memory'
import * as PouchDB from 'pouchdb-core'
import { empty, of } from 'rxjs'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import { WorkerStatus } from '../src/model'
import {Worker} from '../src/worker'
PouchDB.plugin(pouchdbAdapterMemory)
chai.use(sinonChai)
const expect = chai.expect
let dbIndex = 1
function newDb<T>() {
  return  new PouchDB<T>((dbIndex++).toString(), {adapter: 'memory'})
}

describe('Worker', function() {
  const initialSequence = '1initialSequence'
  const workerId = 'workerId'
  const savedSequence = '2savedSequence'
  const nextSequence = '3nextSequence'
  const sourceItems = [{}]
  const mappedItems = [{_id: '1'}]
  it('should use initial sequence if no one is saved', function(done) {
    const workerDb = newDb<WorkerStatus<string>>()
    const sink = new Ouch(newDb())
    const source = sinon.mock().returns(of(...sourceItems))
    new Worker(workerDb,
      workerId,
      source,
      initialSequence,
      (item) => of<any>(...mappedItems),
      () => nextSequence,
      sink,
      (newDoc, oldDoc) => newDoc).run().subscribe({complete() {
        expect(source).to.be.calledWith(initialSequence)
        done()
      }})
  })

  it('should use saved sequence', function(done) {
    const workerDb = newDb<WorkerStatus<string>>()
    const sink = new Ouch(newDb())
    const source = sinon.mock().returns(of(...sourceItems))
    workerDb.put({_id: workerId, sequence: savedSequence}).then(() => {
      new Worker(workerDb,
        workerId,
        source,
        initialSequence,
        (item) => of<any>(...mappedItems),
        () => nextSequence,
        sink,
        (newDoc, oldDoc) => newDoc).run().subscribe({complete() {
          expect(source).to.be.calledWith(savedSequence)
          done()
        }})
    })
  })

  it('should save sequence', function(done) {
    const workerDb = newDb<WorkerStatus<string>>()
    const sink = new Ouch(newDb())
    const source = sinon.mock().returns(of(...sourceItems))
    new Worker(workerDb,
      workerId,
      source,
      initialSequence,
      (item) => of<any>(...mappedItems),
      () => nextSequence,
      sink,
      (newDoc, oldDoc) => newDoc).run().subscribe({complete() {
        workerDb.get(workerId).then((status) => {
          expect(status).to.have.property('sequence', nextSequence)
          done()
        }).catch(done)
      }})
  })

  it('should update sequence', function(done) {
    const workerDb = newDb<WorkerStatus<string>>()
    const sink = new Ouch(newDb())
    const source = sinon.mock().returns(of(...sourceItems))
    workerDb.put({_id: workerId, sequence: savedSequence}).then(() => {
      new Worker(workerDb,
        workerId,
        source,
        initialSequence,
        (item) => of<any>(...mappedItems),
        () => nextSequence,
        sink,
        (newDoc, oldDoc) => newDoc).run().subscribe({complete() {
          workerDb.get(workerId).then((status) => {
            expect(status).to.have.property('sequence', nextSequence)
            done()
          }).catch(done)
        }})
    })
  })

  it('should not rewind sequence', function(done) {
    const workerDb = newDb<WorkerStatus<string>>()
    const sink = new Ouch(newDb())
    const source = sinon.mock().returns(of(...sourceItems))
    workerDb.put({_id: workerId, sequence: savedSequence}).then(() => {
      new Worker(workerDb,
        workerId,
        source,
        initialSequence,
        (item) => of<any>(...mappedItems),
        () => initialSequence,
        sink,
        (newDoc, oldDoc) => newDoc).run().subscribe({complete() {
          workerDb.get(workerId).then((status) => {
            expect(status).to.have.property('sequence', savedSequence)
            done()
          }).catch(done)
        }})
    })
  })

  it('should save mapped items', function(done) {
    const workerDb = newDb<WorkerStatus<string>>()
    const sinkDb = newDb()
    const sink = new Ouch(sinkDb)
    const source = sinon.mock().returns(of(...sourceItems))
    new Worker(workerDb,
      workerId,
      source,
      initialSequence,
      (item) => of<any>(...mappedItems),
      () => nextSequence,
      sink,
      (newDoc, oldDoc) => newDoc).run().subscribe({complete() {
        Promise.all(_.map(mappedItems, (item) => sinkDb.get(item._id))).then((documents) => {
          done()
        }).catch(done)
      }})
  })
  it('should call map with items', function(done) {
    const workerDb = newDb<WorkerStatus<string>>()
    const sink = new Ouch(newDb())
    const source = (sequence) => of(...sourceItems)
    const mapFunction = sinon.spy((item) => of<any>(...mappedItems))
    new Worker(workerDb,
      workerId,
      source,
      initialSequence,
      mapFunction,
      () => nextSequence,
      sink,
      (newDoc, oldDoc) => newDoc).run().subscribe({complete() {
        _.forEach(sourceItems, (item) => expect(mapFunction).to.be.calledWith(item))
        done()
      }})
  })
})
