'use strict'

var merge = require('merge')
var s = require('ht-schema')

function hte (client, service, method, datas, requestedBits) {
  if (!datas || !Array.isArray(datas)) {
    datas = [ 'body' ]
  }

  return function (req, res) {
    var data = {}
    var requested = {}

    datas.forEach(function (d) {
      if (typeof d === 'object') {
        merge(data, d)
        return
      }

      var v = req[d]
      if (typeof v !== 'object' && !Array.isArray(v)) {
        data[d] = v
        return
      }
      merge(data, req[d])
    })

    if (requestedBits && Object.keys(requestedBits).length) {
      requestedBits.forEach(function (d) {
        requested[d] = req[d]
      })
      data.hteRequest = requested
    }

    client.call(service, method, data, function (err, response) {
      var statusCode
      if (err) {
        statusCode = err.$htValidationError ? 400 : 500

        // HT wraps error messages in { error: }
        err = err.error

        if (typeof err !== 'object') {
          return res.status(statusCode).end(err)
        }

        if (err.statusCode && typeof err.statusCode === 'number') {
          statusCode = err.statusCode
          delete err.statusCode
        }

        if (err.headers && typeof err.headers === 'object') {
          res.set(err.headers)
          delete err.headers
        }

        return res.status(statusCode).json(err)
      }

      statusCode = 200

      if (typeof response !== 'object') {
        return res.status(statusCode).end(response)
      }

      if (response.statusCode && typeof response.statusCode === 'number') {
        statusCode = response.statusCode
        delete response.statusCode
      }

      if (response.headers && typeof response.headers === 'object') {
        res.set(response.headers)
        delete response.headers
      }

      return res.status(statusCode).json(response)
    })
  }
}

hte.Request = s.Object({
  headers: s.Array([ s.String() ]),
  url: s.String(),
  method: s.String(),
  params: s.Object({ strict: false }),
  query: s.Object({ strict: false })
}, {
  strict: false
})

module.exports = hte
