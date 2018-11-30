import * as chai from 'chai'
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
  const initialSequence = 'initialSequence'
  const workerId = 'workerId'
  const savedSequence = 'savedSequence'
  const nextSequence = 'nextSequence'
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
      (item) => of<any>(mappedItems),
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
        (item) => of<any>(mappedItems),
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
      (item) => of<any>(mappedItems),
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
