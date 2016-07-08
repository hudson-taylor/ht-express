'use strict'

var merge = require('merge')

function hte (client, service, method, datas) {
  if (!datas || !Array.isArray(datas)) {
    datas = [ 'body' ]
  }

  return function (req, res) {
    var data = {}
    datas.forEach(function (d) {
      var v = req[d]
      if (typeof v !== 'object' && !Array.isArray(v)) {
        data[d] = v
        return
      }
      merge(data, req[d])
    })
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

      return res.status(statusCode).json(response)
    })
  }
}

module.exports = hte
