
"use strict";

var merge = require("merge");

function hte(client, service, method, datas) {

  if(!datas || !Array.isArray(datas)) {
    datas = [ 'body' ];
  }

  return function(req, res) {
    var data = {};
    datas.forEach(function(d) {
      merge(data, req[d]);
    });
    client.call(service, method, data, function(err, response) {

      if(err) {

        var statusCode = err.$htValidationError ? 400 : 500;

        // HT wraps error messages in { error: }
        err = err.error;

        if(typeof err !== 'object') {
          return res.status(statusCode).end(err);
        }

        if(err.statusCode && typeof err.statusCode === 'number') {
          statusCode = err.statusCode;
          delete err.statusCode;
        }

        return res.status(statusCode).json(err);

      }

      var statusCode = 200;

      if(typeof response !== 'object') {
        return res.status(statusCode).end(response);
      }

      if(response.statusCode && typeof response.statusCode === 'number') {
        statusCode = response.statusCode;
        delete response.statusCode;
      }

      return res.status(statusCode).json(response);
    
    });
  }
}

module.exports = hte;