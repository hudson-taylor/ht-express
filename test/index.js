/* eslint-env node, mocha */
var assert = require('assert')
var express = require('express')
var bodyParser = require('body-parser')
var request = require('supertest')
var ht = require('hudson-taylor')
var s = require('ht-schema')

var hte = require('../')

describe('HT Express', function () {
  it('should return response from method', function (done) {
    var client = getClientWithServices({ s1: { m1: function (data, callback) {
      return callback(null, 'hello world')
    } } })

    var app = express()
    app.get('/', hte(client, 's1', 'm1'))

    request(app)
      .get('/')
      .expect(200)
      .expect('hello world')
      .end(done)
  })

  it('should return correct json headers if response is an object', function (done) {
    var client = getClientWithServices({ s1: { m1: function (data, callback) {
      return callback(null, data)
    } } })

    var app = express()
    app.use(bodyParser.json())
    app.get('/', hte(client, 's1', 'm1'))

    var data = {
      hello: 'world'
    }

    request(app)
      .get('/')
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')
      .send(data)
      .end(function (err, res) {
        assert.ifError(err)
        assert.deepEqual(res.body, data)
        done()
      })
  })

  it('should return custom code if statusCode is set in response', function (done) {
    var client = getClientWithServices({ s1: { m1: function (data, callback) {
      return callback(null, {
        statusCode: 201,
        something: 'else'
      })
    } } })

    var app = express()
    app.post('/', hte(client, 's1', 'm1'))

    request(app)
      .post('/')
      .expect(201)
      .expect({ something: 'else' })
      .end(done)
  })

  it('should only pull data from body by default', function (done) {
    var client = getClientWithServices({ s1: { m1: function (data, callback) {
      assert.deepEqual(data, {
        hello: 'world'
      })
      done()
    } } })

    var app = express()
    app.use(bodyParser.json())
    app.post('/', hte(client, 's1', 'm1'))

    request(app)
      .post('/')
      .query({
        not: 'used'
      })
      .send({
        hello: 'world'
      })
      .expect(200)
      .end()
  })

  it('should pull data from other places if specified', function (done) {
    var client = getClientWithServices({ s1: { m1: function (data, callback) {
      assert.deepEqual(data, {
        hello: 'world',
        is: 'used'
      })
      done()
    } } })

    var app = express()
    app.use(bodyParser.json())
    app.post('/', hte(client, 's1', 'm1', [ 'body', 'query' ]))

    request(app)
      .post('/')
      .query({
        is: 'used'
      })
      .send({
        hello: 'world'
      })
      .expect(200)
      .end()
  })

  it('should pull non-object data from other places if specified', function (done) {
    var client = getClientWithServices({ s1: { m1: function (data, callback) {
      assert.deepEqual(data, {
        hello: 'world',
        ip: '1.2.3.4'
      })
      callback()
    } } })

    var app = express()
    app.use(bodyParser.json())
    app.set('trust proxy', 1)
    app.post('/', hte(client, 's1', 'm1', [ 'body', 'ip' ]))

    request(app)
      .post('/')
      .send({
        hello: 'world'
      })
      .set('x-forwarded-for', '1.2.3.4')
      .expect(200)
      .end(done)
  })

  it('should merge data properly', function (done) {
    var client = getClientWithServices({ s1: { m1: function (data, callback) {
      assert.deepEqual(data, {
        one: 1,
        two: 22,
        three: 333
      })
      done()
    } } })

    var app = express()
    app.use(bodyParser.json())
    app.post('/:three', hte(client, 's1', 'm1', [ 'body', 'query', 'params' ]))

    request(app)
      .post('/333')
      .query({
        two: 22,
        three: 33
      })
      .send({
        one: 1,
        two: 2,
        three: 3
      })
      .expect(200)
      .end()
  })

  it('should return 400 if there was a validation error', function (done) {
    var client = getClientWithServices({ s1: { m1: {
      fn: function (data, callback) {
        return callback()
      },
      schema: s.Number()
    } } })

    var app = express()
    app.get('/', hte(client, 's1', 'm1'))

    request(app)
      .get('/')
      .expect(400)
      .end(function (err, res) {
        assert.ifError(err)
        assert.equal(res.text, 'required Number, received object')
        done()
      })
  })

  it('should return 500 if statusCode is not set in error', function (done) {
    var client = getClientWithServices({ s1: { m1: function (data, callback) {
      return callback({
        something: 'else'
      })
    } } })

    var app = express()
    app.post('/', hte(client, 's1', 'm1'))

    request(app)
      .post('/')
      .expect(500)
      .end(done)
  })

  it('should return custom code if statusCode is set in error', function (done) {
    var client = getClientWithServices({ s1: { m1: function (data, callback) {
      return callback({
        statusCode: 501,
        something: 'else'
      })
    } } })

    var app = express()
    app.post('/', hte(client, 's1', 'm1'))

    request(app)
      .post('/')
      .expect(501)
      .end(done)
  })

  it('should return 500 if error is not an object', function (done) {
    var client = getClientWithServices({ s1: { m1: function (data, callback) {
      return callback('error')
    } } })

    var app = express()
    app.get('/', hte(client, 's1', 'm1'))

    request(app)
      .get('/')
      .expect(500)
      .end(function (err, res) {
        assert.ifError(err)
        assert.equal(res.text, 'error')
        done()
      })
  })
})

function getClientWithServices (services) {
  /*
    services should look something like:
    {
      service1: {
        method1: function (data, callback) {

        },
        method2: {
          fn: function (data, callback) {},
          schema: s.String()
        }
      },
      service2: ..etc
    }
  */
  var client = new ht.Client()
  for (var service in services) {
    var t = new ht.Transports.Local()
    var s = new ht.Service(t)
    for (var method in services[service]) {
      var p = services[service][method]
      if (typeof p === 'function') p = { fn: p }
      s.on(method, p.schema, p.fn)
    }
    client.add(service, t)
  }
  return client
}
