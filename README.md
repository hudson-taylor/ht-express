# ht-express
Express middleware for routing requests to HT services

[![Build Status](https://travis-ci.org/hudson-taylor/ht-express.svg?branch=master)](https://travis-ci.org/hudson-taylor/ht-express)
[![Coverage Status](https://img.shields.io/coveralls/hudson-taylor/ht-express.svg)](https://coveralls.io/r/hudson-taylor/ht-express)

This package is routing express requests to HT services. This allows you to serve an API using strictly defined and documentable methods.

# Installation

```js
npm install ht-express
```

# Usage

## hte(client, service, method [, pull])

### client

`client` needs to be an instance of ht.Client, that has already been connected to the services that you're going to call.

### service

`service` is the service that you wish to call.

### method

`method` is the method that you with to call.

### pull

`pull` is an optional array - it defaults to `[ 'body' ]`. For each item in this array, the same object from `req` is merged into the data send to the service. **E.g.** If you wish to use only query strings from the url, specify `[ 'query' ]`. If you wish to use both the body of the request, and params from the url, set `[ 'body', 'params' ]`.

## Schema validaton errors

If the data collection from a request does not match the schema for a method, the HTTP response code will be set to `400`, and the body of the response will be the validation error message.

## Special Response Keys

### statusCode

If the response from a service is an object, and has a key `statusCode` that is a number, the HTTP response code will be set to that value. This key will then be removed from the response.

# Example

```js

var express = require('express');
var ht      = require('hudson-taylor');
var hte     = require('ht-express');
var s       = require('ht-schema');

// Create a new Local HT service
var transport = new ht.Transport.Local();
var service = new ht.Service(transport);
var client = new ht.Client({
  service: transport
});

// Add a method for the service
service.on("sayHello", s.String(), function(data, callback) {
  var response = 'Hello ' + data;
  return callback(null, response);
});

// Create a new express app
var app = express();

// Mount the service method on a url
app.get('/sayhello', hte(client, 'service', 'sayHello'));

// If you hit /sayHello with a string as a json body
// you will get a response that says 'Hello {body}'!

```