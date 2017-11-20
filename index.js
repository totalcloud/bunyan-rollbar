'use strict';

var _ = require('lodash');

var levelMapping = {};

var BunyanRollbar = function() {
  this.initialize.apply(this, arguments);
};

_.extend(BunyanRollbar.prototype, {
  initialize: function(options) {
    options = options || {};
    if(!options.rollbar || !options.bunyan) {
      throw new error('rollbar and bunyan instance required')
    }
    this.rollbar = options.rollbar;
    var bunyan = options.bunyan;
    levelMapping[bunyan.TRACE] = 'debug';
    levelMapping[bunyan.DEBUG] = 'debug';
    levelMapping[bunyan.INFO] = 'info';
    levelMapping[bunyan.WARN] = 'warning';
    levelMapping[bunyan.ERROR] = 'error';
    levelMapping[bunyan.FATAL] = 'critical';
  },

  write: function(record) {
    if(!_.isObject(record)) {
      throw new Error('bunyan-rollbar requires a raw stream. Please define the type as raw when setting up the bunyan-rollbar stream.');
    }

    // If Bunyan has serialized the Error object, try to retrieve the real
    // error object to send to Rollbar, so it can process the error object
    // itself. This requires use of the customized
    // bunyanRollbar.stdSerializers.
    var error;
    if(record.err && record.err._bunyanRollbarOriginalObject && (record.err._bunyanRollbarOriginalObject instanceof Error)) {
      error = record.err._bunyanRollbarOriginalObject;
    } else if(record.err && (record.err instanceof Error)) {
      error = record.err;
    }

    // Similar to above, but for the request object. Try to retrieve the real
    // request object to send to Rollbar.
    var request;
    if(record.req && record.req._bunyanRollbarOriginalObject && record.req._bunyanRollbarOriginalObject.connection) {
      request = record.req._bunyanRollbarOriginalObject;
    } else if(record.req && record.req.connection) {
      request = record.req;
    }

    var payload = {
      level: levelMapping[record.level] || 'error',
      custom: record,
    };

    // If we're sending Rollbar the real error or request objects, remove those
    // references from the custom playload so there's not duplicate data.
    if(error) {
      payload.custom = _.omit(payload.custom, 'err');
    }
    if(request) {
      payload.custom = _.omit(payload.custom, 'req');
    }

    // Rollbar expects errors and general messages to be passed differently.
    if(error) {
      this.rollbar.handleErrorWithPayloadData(error, payload, request);
    } else {
      payload.custom = _.omit(payload.custom, 'msg');
      this.rollbar.reportMessageWithPayloadData(record.msg, payload, request);
    }
  },
});

module.exports.Stream = BunyanRollbar;
