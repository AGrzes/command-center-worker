import * as chai from 'chai'
import 'mocha'
import * as mock from 'mock-fs'
import * as sinonChai from 'sinon-chai'
import loadConfig from '../../src/config/sync'
import { DbConfig } from '../../src/model/pouchdb'
chai.use(sinonChai)
const expect = chai.expect
describe('config', function() {
  describe('sync', function() {
    before(function() {
      mock({
        file1: `
- from:
    name: fromName
    server:
      url: fromUrl
      key: fromKey
      cert: fromCert
  to:
    name: toName
    server:
      url: toUrl
      key: toKey
      cert: toCert
        `
      })
    })
    after(function() {
      mock.restore()
    })
    it('should load config', function() {
      return loadConfig('file1').then((config) => {
        expect(config).to.be.deep.equals([{
          from: {
            name: 'fromName',
            server: {
              url: 'fromUrl',
              key: 'fromKey',
              cert: 'fromCert'
            }
          },
          to: {
            name: 'toName',
            server: {
              url: 'toUrl',
              key: 'toKey',
              cert: 'toCert'
            }
          }
        }])
      })
    })
    it('should fail on non existing file', function() {
      return loadConfig('file2').then(() => expect.fail()).catch((error) => {
        expect(error).to.have.property('code', 'ENOENT')
      })
    })
  })
})
