import * as chai from 'chai'
import 'mocha'
import { Ouch } from 'ouch-rx'
import * as pouchdbAdapterMemory from 'pouchdb-adapter-memory'
import * as PouchDB from 'pouchdb-core'
import { empty } from 'rxjs'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import {Worker} from '../src/worker'
PouchDB.plugin(pouchdbAdapterMemory)
chai.use(sinonChai)
const expect = chai.expect
describe('Worker', function() {

  it('should use initial sequence if no one is saved', function(done) {
    const workerDb = new PouchDB('1', {adapter: 'memory'})
    const sink = new Ouch(new PouchDB('2', {adapter: 'memory'}))
    const source = sinon.mock().returns(empty())
    new Worker(workerDb,
      'id',
      source,
      'initialSequence',
      (item) => empty(),
      () => 'nextSequence',
      sink,
      (newDoc, oldDoc) => newDoc).run().subscribe({complete() {
        expect(source).to.be.calledWith('initialSequence')
        done()
      }})
  })
})
