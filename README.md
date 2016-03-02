promise-nodeify
===============

[![Build status](https://img.shields.io/travis/kevinoid/promise-nodeify.svg?style=flat)](https://travis-ci.org/kevinoid/promise-nodeify)
[![Coverage](https://img.shields.io/codecov/c/github/kevinoid/promise-nodeify.svg?style=flat)](https://codecov.io/github/kevinoid/promise-nodeify?branch=master)
[![Dependency Status](https://img.shields.io/david/kevinoid/promise-nodeify.svg?style=flat)](https://david-dm.org/kevinoid/promise-nodeify)
[![Supported Node Version](https://img.shields.io/node/v/promise-nodeify.svg?style=flat)](https://www.npmjs.com/package/promise-nodeify)
[![Version on NPM](https://img.shields.io/npm/v/promise-nodeify.svg?style=flat)](https://www.npmjs.com/package/promise-nodeify)

Call a Node-style callback with the resolution value or rejection cause of a
Promise without the common gotchas.

## Introductory Example

```js
var promiseNodeify = require('promise-nodeify');

// Function which returns a Promise
function returnsPromise() {
  return new Promise(function(resolve, reject) {
    resolve(42);
  });
}

// Function which takes a node-style callback and relies on returnsPromise
function takesCallback(callback) {
  var promise = returnsPromise();
  // if callback is not a function, promise is returned as-is
  // otherwise callback will be called when promise is resolved or rejected
  // callback has no effect on the returned Promise
  // promise will not cause unhandledRejection if callback is a function
  return promiseNodeify(promise, callback);
}
```

## Features

The important features of `nodeify` as compared to naive implementations:

* Any values returned or thrown by callback have no effect on the returned
  promise (unlike returning result of passing callback to `.then`).
* Exceptions thrown by callback cause `uncaughtException` as they would for
  other callbacks (unlike passing callback to `.then`, which causes
  `unhandledRejection` or swallows them).
* Creates `Error` for falsey rejection causes.  Since Promises may resolve or
  reject without providing a value or cause, the callback would have no way to
  distinguish success from failure.  This module ensures the error argument is
  always truthy, substituting an `Error` when the rejection cause is falsey
  (and passing the original value as the `.cause` property, as bluebird does).

## Behavior Comparison

This module provides similar behavior to several popular promise libraries in
a promise-library-agnostic way which only requires the ES6 promise
functionality subset.  However, these existing implementations differ in
subtle ways.  A brief comparison:

Behavior | this module | [bluebird `#asCallback`](http://bluebirdjs.com/docs/api/ascallback.html) | [es-nodeify](https://github.com/robbertkl/es-nodeify) | [then `#nodeify`](https://github.com/then/promise#promisenodeifycallback) | [then `nodeify`](https://github.com/then/nodeify) | [Un-thenify](https://github.com/blakeembrey/unthenify)<sup>[1](#note-1)</sup> | [when.js `node.bindCallback`](https://github.com/cujojs/when/blob/master/docs/api.md#nodebindcallback)
With `function` arg returns | `undefined` | `this` `Promise`<sup>[2](#note-2)</sup> | `undefined` | `undefined` | `Promise<undefined>` | `undefined` | `undefined`
callback exceptions | `uncaughtException` | `uncaughtException` | `unhandledRejection` | `uncaughtException` | `uncaughtException` | `unhandledRejection` | `uncaughtException`
falsey cause | `Error` with `.cause` | `Error` with `.cause`<sup>[3](#note-3)</sup> | `Error` | falsey cause | falsey cause | `TypeError` | falsey cause
reject callback argument length | 1 | 1 | 1 | 1 | 1 | 1 | 2
resolve callback argument length | 2 | `undefined` 1, else 2<sup>[4](#note-4)</sup> | 2 | 2 | 2 | 2 | 2
non-function argument | ignored | ignored | falsey ignored, truthy `unhandledRejection` | ignored | ignored | `unhandledRejection` | falsey ignored, truthy `uncaughtException`
extra argument | ignored | options<sup>[5](#note-5)</sup> | ignored | `this` of callback | ignored | ignored | ignored

Notes:

1. <a id="note-1" name="note-2" /> Un-thenify serves a similar purpose, but
   wraps the Promise-returning function rather than taking the Promise as an
   argument.
2. <a id="note-2" name="note-3" /> Temporarily reverted in
   https://github.com/petkaantonov/bluebird/issues/151 and restored in
   https://github.com/petkaantonov/bluebird/issues/168
3. <a id="note-3" name="note-4" /> In response to
   https://github.com/petkaantonov/bluebird/issues/434
4. <a id="note-4" name="note-5" /> In response to
   https://github.com/petkaantonov/bluebird/issues/170
5. <a id="note-5" name="note-6" /> Supports the `spread` boolean option to
   pass `Array` values as separate arguments to `callback`.

## Performance Comparison

## Installation

[This package](https://www.npmjs.com/package/promise-nodeify) can be installed
using [npm](https://www.npmjs.com/) by running:

```sh
npm install promise-nodeify
```

## Recipes

### Delegate to `Promise.prototype.nodeify`

If the behavior differences discussed in the [Behavior
Comparison](#behavior-comparison) section (and any future differences which
may occur) are not significant to your use case and you are interested in
taking advantage of the potential [performance
benefit](#performance-comparison) of the implementation provided by the
promise library, use the `.delegated` function:

```js
// Using .delegated delegates to .nodeify on the promise argument when present
var promiseNodeify = require('promise-nodeify').delegated;

function returnsPromise() {
  return new Promise(function(resolve, reject) {
    resolve(42);
  });
}

function takesCallback(callback) {
  var promise = returnsPromise();
  return promiseNodeify(promise, callback);
}
```

### Polyfill `Promise.prototype.nodeify`

To polyfill the `.nodeify` (or `.asCallback`) method for a Promise library,
assign the `.nodeifyThis` function to `Promise.prototype.nodeify` as follows:

```js
Promise.prototype.nodeify = require('promise-nodeify').nodeifyThis;

function returnsPromise() {
  return new Promise(function(resolve, reject) {
    resolve(42);
  });
}

function takesCallback(callback) {
  var promise = returnsPromise();
  return promise.nodeify(callback);
}
```

More examples can be found in the [test
specifications](https://kevinoid.github.io/promise-nodeify/specs).

## API Docs

For a description of the available functions and their arguments, see the [API
Documentation](https://kevinoid.github.io/promise-nodeify/api).

## Contributing

Contributions are welcome and very much appreciated!  Please add tests to
cover any changes and ensure `npm test` passes.

If the desired change is large, complex, backwards-incompatible, can have
significantly differing implementations, or may not be in scope for this
project, opening an issue before writing the code can avoid frustration and
save a lot of time and effort.

## License

This package is available under the terms of the
[MIT License](https://opensource.org/licenses/MIT).
