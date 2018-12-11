import * as chai from 'chai'
import 'mocha'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import setUpSync from '../../src/controller/sync'
import { DbConfig } from '../../src/pouchdb'
chai.use(sinonChai)
const expect = chai.expect
describe('controller', function() {
  describe('sync', function() {
    it('should call `configureDb` with configs', function() {
      const syncMock = sinon.mock().atLeast(1)
      const configureDb = sinon.mock().atLeast(1)
      const from: DbConfig = {name: 'from', server: {url: 'url'}}
      const to: DbConfig = {name: 'to', server: {url: 'url'}}
      setUpSync([{from, to}], syncMock, configureDb)
      expect(configureDb).to.be.calledTwice
      expect(configureDb.firstCall).to.be.calledWith(from)
      expect(configureDb.secondCall).to.be.calledWith(to)
    })

    it('should call `sync` with dbs', function() {
      const syncMock = sinon.mock().atLeast(1)
      const first = 'first'
      const second = 'second'
      const configureDb = sinon.mock().atLeast(1).onFirstCall().returns(first).onSecondCall().returns(second)
      const from: DbConfig = {name: 'from', server: {url: 'url'}}
      const to: DbConfig = {name: 'to', server: {url: 'url'}}
      setUpSync([{from, to}], syncMock, configureDb)
      expect(syncMock).to.be.calledOnceWith(first, second)
    })
  })
})
