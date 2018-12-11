import * as chai from 'chai'
import 'mocha'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import PouchDB from '../../src/pouchdb'
import sync from '../../src/service/sync'
chai.use(sinonChai)
const expect = chai.expect
describe('service', function() {
  describe('sync', function() {
    it('should call `replicate.to`', function() {
      const from = { replicate: { to: sinon.mock()}}
      from.replicate.to.returns({on() {return this}})
      sync(from as unknown as PouchDB.Database, null)
      expect(from.replicate.to).to.be.calledOnce
    })

    it('should pass targetDatabase to  `replicate.to`', function() {
      const from = { replicate: { to: sinon.mock()}}
      const targetDatabase = {}
      from.replicate.to.returns({on() {return this}})
      sync(from as unknown as PouchDB.Database, targetDatabase as unknown as PouchDB.Database)
      expect(from.replicate.to).to.be.calledOnceWith(targetDatabase)
    })

    it('should pass options to `replicate.to`', function() {
      const from = { replicate: { to: sinon.mock()}}
      const targetDatabase = {}
      from.replicate.to.returns({on() {return this}})
      sync(from as unknown as PouchDB.Database, targetDatabase as unknown as PouchDB.Database)
      expect(from.replicate.to).to.be.calledOnceWith(targetDatabase, {live: true, retry: true})
    })

    it('should call `replicate.to`', function() {
      const from = { replicate: { to: sinon.mock()}}
      const replication = {on: sinon.mock()}
      from.replicate.to.returns(replication)
      replication.on.atLeast(1).returnsThis()
      sync(from as unknown as PouchDB.Database, null)
      const listeners = replication.on.args
      listeners.forEach(([name, handler]) => {
        expect(name).to.be.oneOf(['change', 'paused', 'denied', 'error', 'active', 'complete'])
        try {
          switch (name) {
            case 'change':
              handler({})
              break
            case 'paused':
              handler({})
              break
            case 'denied':
              handler({})
              break
            case 'error':
              handler({})
              break
            case 'active':
              handler()
              break
            case 'complete':
              handler({})
              break
          }
        } catch (e) {
          expect.fail(e, undefined, 'Expected handler not to throw error')
        }
      })
    })
  })
})
