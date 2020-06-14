/**
 * @copyright Copyright 2016 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const assert = require('assert');

const awaitGlobalException = require('../test-lib/await-global-exception');
const promiseNodeify = require('..');

describe('promiseNodeify', () => {
  describe('when called with a function', () => {
    it('passes (null, value) to callback on resolution', (done) => {
      const value = {};
      const promise = Promise.resolve(value);
      promiseNodeify(promise, function(err, result) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(err, null);
        assert.strictEqual(result, value);
        done();
      });
    });

    it('passes undefined value to callback on resolution', (done) => {
      let value;
      const promise = Promise.resolve(value);
      promiseNodeify(promise, (err, result) => {
        // Note:  arguments.length is unspecified
        // Although it is currently 2, that may change.  Don't depend on it.
        assert.strictEqual(err, null);
        assert.strictEqual(result, value);
        done();
      });
    });

    it('passes Error cause to callback on rejection', (done) => {
      const cause = new Error();
      const promise = Promise.reject(cause);
      promiseNodeify(promise, function(err) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(err, cause);
        done();
      });
    });

    it('passes truthy cause to callback on rejection', (done) => {
      const cause = true;
      const promise = Promise.reject(cause);
      promiseNodeify(promise, function(err) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(err, cause);
        done();
      });
    });

    it('passes Error with falsey .cause on rejection', (done) => {
      const cause = 0;
      const promise = Promise.reject(cause);
      promiseNodeify(promise, function(err) {
        assert.strictEqual(arguments.length, 1);
        assert(err instanceof Error);
        assert.strictEqual(err.message, String(cause));
        assert(hasOwnProperty.call(err, 'cause'));
        assert.strictEqual(err.cause, cause);
        done();
      });
    });

    it('returns undefined', () => {
      const value = {};
      const promise = Promise.resolve(value);
      const retVal = promiseNodeify(promise, () => {});
      assert.strictEqual(retVal, undefined);
    });

    it('ignores callback return value', () => {
      const value = {};
      const promise = Promise.resolve(value);
      promiseNodeify(promise, () => true);
      return promise.then((result) => {
        assert.strictEqual(result, value);
      });
    });

    it('callback exception causes uncaughtException', () => {
      const value = {};
      const errCallback = new Error('Test callback error');
      const promise = Promise.resolve(value);

      let unhandledRejection;
      function onUnhandledRejection(reason) {
        unhandledRejection = reason;
      }
      process.once('unhandledRejection', onUnhandledRejection);

      promiseNodeify(promise, () => { throw errCallback; });

      return awaitGlobalException((err) => {
        assert.strictEqual(err, errCallback);
      })
        .finally(() => {
          process.removeListener('unhandledRejection', onUnhandledRejection);
          return unhandledRejection && Promise.reject(unhandledRejection);
        });
    });
  });

  describe('when called with a non-function', () => {
    it('returns a Promise which resolves with the same value', () => {
      const value = {};
      const promise = Promise.resolve(value);
      const promise2 = promiseNodeify(promise, null);
      return promise2.then((result) => {
        assert.strictEqual(result, value);
      });
    });

    it('returns a Promise which rejects with the same cause', () => {
      const cause = new Error();
      const promise = Promise.reject(cause);
      const promise2 = promiseNodeify(promise, null);
      return promise2.then(
        () => {
          assert(false, 'Promise should be rejected');
        },
        (err) => {
          assert.strictEqual(err, cause);
        },
      );
    });
  });

  describe('.delegated', () => {
    it('forwards to .nodeify method on promise', () => {
      const value = {};
      const promise = Promise.resolve(value);
      const nodeifyArg = {};
      const nodeifyRetVal = {};
      promise.nodeify = function(arg) {
        assert.strictEqual(arg, nodeifyArg);
        return nodeifyRetVal;
      };
      const retVal = promiseNodeify.delegated(promise, nodeifyArg);
      assert.strictEqual(retVal, nodeifyRetVal);
    });

    it('forwards to inherited .nodeify method on promise', () => {
      const value = {};
      const promise = Promise.resolve(value);
      const nodeifyArg = {};
      const nodeifyRetVal = {};
      promise.nodeify = function(arg) {
        assert.strictEqual(arg, nodeifyArg);
        return nodeifyRetVal;
      };
      const promise2 = Object.create(promise);
      const retVal = promiseNodeify.delegated(promise2, nodeifyArg);
      assert.strictEqual(retVal, nodeifyRetVal);
    });

    it('ignores non-function .nodeify on promise', (done) => {
      const value = {};
      const promise = Promise.resolve(value);
      promise.nodeify = true;
      promiseNodeify.delegated(promise, function(err, result) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(err, null);
        assert.strictEqual(result, value);
        done();
      });
    });
  });

  describe('.nodeifyThis', () => {
    it('can be used as a method on a promise', (done) => {
      const value = {};
      const promise = Promise.resolve(value);
      promise.nodeify = promiseNodeify.nodeifyThis;
      promise.nodeify(function(err, result) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(err, null);
        assert.strictEqual(result, value);
        done();
      });
    });

    it('when given a function, returns undefined', () => {
      const value = {};
      const promise = Promise.resolve(value);
      promise.nodeify = promiseNodeify.nodeifyThis;
      const retVal = promise.nodeify(() => {});
      assert.strictEqual(retVal, undefined);
    });

    it('when not given a function, returns a Promise', () => {
      const value = {};
      const promise = Promise.resolve(value);
      promise.nodeify = promiseNodeify.nodeifyThis;
      const promise2 = promise.nodeify(null);
      return promise2.then((result) => {
        assert.strictEqual(result, value);
      });
    });
  });
});
