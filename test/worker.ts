import * as chai from 'chai'
import * as _ from 'lodash'
import 'mocha'
import { Ouch } from 'ouch-rx'
import * as pouchdbAdapterMemory from 'pouchdb-adapter-memory'
import * as PouchDB from 'pouchdb-core'
import { empty, Observable, of, throwError } from 'rxjs'
import { delay, tap } from 'rxjs/operators'
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

  it('should handle error when saving sequence', function(done) {
    const workerDb = newDb<WorkerStatus<string>>()
    sinon.stub(workerDb, 'put').throwsException()
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
        workerDb.get(workerId).then(() => expect.fail()).catch((error) => {
          expect(error).to.have.property('name', 'not_found')
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

  it('should propagate error from source', function(done) {
    const workerDb = newDb<WorkerStatus<string>>()
    const sink = new Ouch(newDb())
    const source = () => throwError(new Error())
    new Worker(workerDb,
      workerId,
      source,
      initialSequence,
      (item) => of<any>(...mappedItems),
      () => nextSequence,
      sink,
      (newDoc, oldDoc) => newDoc).run().subscribe({complete() {
        expect.fail()
        done()
      }, error() {
        done()
      }})
  })
  it('should propagate error from source', function(done) {
    const workerDb = newDb<WorkerStatus<string>>()
    const sink = new Ouch(newDb())
    const source = () => {throw new Error()}
    new Worker(workerDb,
      workerId,
      source,
      initialSequence,
      (item) => of<any>(...mappedItems),
      () => nextSequence,
      sink,
      (newDoc, oldDoc) => newDoc).run().subscribe({complete() {
        expect.fail()
        done()
      }, error() {
        done()
      }})
  })
  it('should propagate error from merge', function(done) {
    const workerDb = newDb<WorkerStatus<string>>()
    const sink = new Ouch(newDb())
    const source = (sequence) => of(...sourceItems)
    new Worker(workerDb,
      workerId,
      source,
      initialSequence,
      (item) => {throw new Error()},
      () => nextSequence,
      sink,
      (newDoc, oldDoc) => newDoc).run().subscribe({complete() {
        expect.fail()
        done()
      }, error() {
        done()
      }})
  })
  it('should propagate error from merge', function(done) {
    const workerDb = newDb<WorkerStatus<string>>()
    const sink = new Ouch(newDb())
    const source = (sequence) => of(...sourceItems)
    new Worker(workerDb,
      workerId,
      source,
      initialSequence,
      (item) => throwError(new Error()) as Observable<any>,
      () => nextSequence,
      sink,
      (newDoc, oldDoc) => newDoc).run().subscribe({complete() {
        expect.fail()
        done()
      }, error() {
        done()
      }})
  })
  it('should propagate error from sequence', function(done) {
    const workerDb = newDb<WorkerStatus<string>>()
    const sink = new Ouch(newDb())
    const source = (sequence) => of(...sourceItems)
    new Worker(workerDb,
      workerId,
      source,
      initialSequence,
      (item) => of<any>(...mappedItems),
      () => {throw new Error()},
      sink,
      (newDoc, oldDoc) => newDoc).run().subscribe({complete() {
        expect.fail()
        done()
      }, error() {
        done()
      }})
  })
  it('should use override function if custom is not provided', function(done) {
    const workerDb = newDb<WorkerStatus<string>>()
    const sinkDb = newDb()
    const sink = new Ouch(sinkDb)
    const source =  (sequence) => of(...sourceItems)
    const merge = sinon.spy()
    new Worker(workerDb,
      workerId,
      source,
      initialSequence,
      (item) => of<any>(...mappedItems),
      () => nextSequence,
      sink).run().subscribe({complete() {
        Promise.all(_.map(mappedItems, (item) => sinkDb.get(item._id))).then((documents) => {
          done()
        }).catch(done)
      }})
  })

  it('should not map in parallel', function(done) {
    const workerDb = newDb<WorkerStatus<string>>()
    const sink = new Ouch(newDb())
    const source = (sequence) => of({_id: '1'}, {_id: '2'})
    let inProgres = 0
    let parallel = 0
    const mapFunction = (item) => of<any>(item)
      .pipe(tap(() => parallel = Math.max(parallel, ++inProgres)), delay(100), tap(() => inProgres--))
    new Worker(workerDb,
      workerId,
      source,
      initialSequence,
      mapFunction,
      () => nextSequence,
      sink,
      (newDoc, oldDoc) => newDoc).run().subscribe({complete() {
        expect(parallel).to.be.eq(1)
        done()
      }})
  })
})
