import * as chai from 'chai'
import 'mocha'
import PouchDB from '../src/pouchdb'
const expect = chai.expect
describe('pouchdb', function() {
  it('should implement `query`', function() {
    expect(PouchDB.prototype.query).to.exist
    expect(PouchDB.prototype.query).to.be.a.instanceOf(Function)
  })
  it('should implement `sync`', function() {
    expect(PouchDB.prototype.sync).to.exist
    expect(PouchDB.prototype.sync).to.be.a.instanceOf(Function)
  })

  it('should implement `http` adapter', function() {
    expect(new PouchDB('http://example.com', {adapter: 'http'})).to.exist
  })
})
