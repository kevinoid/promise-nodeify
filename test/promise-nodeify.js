/**
 * @copyright Copyright 2016 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */
'use strict';

var BBPromise = require('bluebird').Promise;
var assert = require('assert');
var awaitGlobalException = require('../test-lib/await-global-exception');
var promiseFinally = require('promise-finally').default;
var promiseNodeify = require('..');

var PPromise = typeof Promise !== 'undefined' ? Promise : BBPromise;

describe('promiseNodeify', function() {
  describe('when called with a function', function() {
    it('passes (null, value) to callback on resolution', function(done) {
      var value = {};
      var promise = PPromise.resolve(value);
      promiseNodeify(promise, function(err, result) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(err, null);
        assert.strictEqual(result, value);
        done();
      });
    });

    it('passes undefined value to callback on resolution', function(done) {
      var value = undefined;
      var promise = PPromise.resolve(value);
      promiseNodeify(promise, function(err, result) {
        // Note:  arguments.length is unspecified
        // Although it is currently 2, that may change.  Don't depend on it.
        assert.strictEqual(err, null);
        assert.strictEqual(result, value);
        done();
      });
    });

    it('passes Error cause to callback on rejection', function(done) {
      var cause = new Error();
      var promise = PPromise.reject(cause);
      promiseNodeify(promise, function(err) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(err, cause);
        done();
      });
    });

    it('passes truthy cause to callback on rejection', function(done) {
      var cause = true;
      var promise = PPromise.reject(cause);
      promiseNodeify(promise, function(err) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(err, cause);
        done();
      });
    });

    it('passes Error with falsey .cause on rejection', function(done) {
      var cause = 0;
      var promise = PPromise.reject(cause);
      promiseNodeify(promise, function(err) {
        assert.strictEqual(arguments.length, 1);
        assert(err instanceof Error);
        assert.strictEqual(err.message, String(cause));
        assert(err.hasOwnProperty('cause'));
        assert.strictEqual(err.cause, cause);
        done();
      });
    });

    it('returns undefined', function() {
      var value = {};
      var promise = PPromise.resolve(value);
      var retVal = promiseNodeify(promise, function() {});
      assert.strictEqual(retVal, undefined);
    });

    it('ignores callback return value', function() {
      var value = {};
      var promise = PPromise.resolve(value);
      promiseNodeify(promise, function() { return true; });
      return promise.then(function(result) {
        assert.strictEqual(result, value);
      });
    });

    it('callback exception causes uncaughtException', function() {
      var value = {};
      var errCallback = new Error('Test callback error');
      var promise = PPromise.resolve(value);

      var unhandledRejection;
      function onUnhandledRejection(reason) {
        unhandledRejection = reason;
      }
      process.once('unhandledRejection', onUnhandledRejection);

      promiseNodeify(promise, function() { throw errCallback; });

      return promiseFinally(
        awaitGlobalException(function(err) {
          assert.strictEqual(err, errCallback);
        }),
        function() {
          process.removeListener('unhandledRejection', onUnhandledRejection);
          return unhandledRejection && Promise.reject(unhandledRejection);
        }
      );
    });
  });

  describe('when called with a non-function', function() {
    it('returns a Promise which resolves with the same value', function() {
      var value = {};
      var promise = PPromise.resolve(value);
      var promise2 = promiseNodeify(promise, null);
      return promise2.then(function(result) {
        assert.strictEqual(result, value);
      });
    });

    it('returns a Promise which rejects with the same cause', function() {
      var cause = new Error();
      var promise = PPromise.reject(cause);
      var promise2 = promiseNodeify(promise, null);
      return promise2.then(
          function() {
            assert(false, 'Promise should be rejected');
          },
          function(err) {
            assert.strictEqual(err, cause);
          }
      );
    });
  });

  describe('.delegated', function() {
    it('forwards to .nodeify method on promise', function() {
      var value = {};
      var promise = PPromise.resolve(value);
      var nodeifyArg = {};
      var nodeifyRetVal = {};
      promise.nodeify = function(arg) {
        assert.strictEqual(arg, nodeifyArg);
        return nodeifyRetVal;
      };
      var retVal = promiseNodeify.delegated(promise, nodeifyArg);
      assert.strictEqual(retVal, nodeifyRetVal);
    });

    it('forwards to inherited .nodeify method on promise', function() {
      var value = {};
      var promise = PPromise.resolve(value);
      var nodeifyArg = {};
      var nodeifyRetVal = {};
      promise.nodeify = function(arg) {
        assert.strictEqual(arg, nodeifyArg);
        return nodeifyRetVal;
      };
      var promise2 = Object.create(promise);
      var retVal = promiseNodeify.delegated(promise2, nodeifyArg);
      assert.strictEqual(retVal, nodeifyRetVal);
    });

    it('ignores non-function .nodeify on promise', function(done) {
      var value = {};
      var promise = PPromise.resolve(value);
      promise.nodeify = true;
      promiseNodeify.delegated(promise, function(err, result) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(err, null);
        assert.strictEqual(result, value);
        done();
      });
    });
  });

  describe('.nodeifyThis', function() {
    it('can be used as a method on a promise', function(done) {
      var value = {};
      var promise = PPromise.resolve(value);
      promise.nodeify = promiseNodeify.nodeifyThis;
      promise.nodeify(function(err, result) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(err, null);
        assert.strictEqual(result, value);
        done();
      });
    });

    it('when given a function, returns undefined', function() {
      var value = {};
      var promise = PPromise.resolve(value);
      promise.nodeify = promiseNodeify.nodeifyThis;
      var retVal = promise.nodeify(function() {});
      assert.strictEqual(retVal, undefined);
    });

    it('when not given a function, returns a Promise', function() {
      var value = {};
      var promise = PPromise.resolve(value);
      promise.nodeify = promiseNodeify.nodeifyThis;
      var promise2 = promise.nodeify(null);
      return promise2.then(function(result) {
        assert.strictEqual(result, value);
      });
    });
  });
});
