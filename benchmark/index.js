/**
 * @copyright Copyright 2016 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

// For convenience, it's easier to require modules inline in this file.
/* eslint-disable global-require */

// Save native promise (if any) early since:
// es-native will overwrite native promise when required
// native-promise-only will overwrite if falsey when required
const NPromise = typeof Promise !== 'undefined' ? Promise : undefined;

const assert = require('node:assert');

const colors = require('ansi-colors');
const Benchmark = require('benchmark');
const CliTable = require('cli-table');
const { Stats } = require('fast-stats');

/** Nodeify functions to benchmark with human-readable name, indexed by global
 * name.
 */
const NODEIFY_FUNCTIONS = {
  bluebirdNodeify: {
    name: 'bluebird#nodeify',
    isMethod: true,
    nodeify: require('bluebird').Promise.prototype.nodeify,
  },
  esNodeify: {
    name: 'es-nodeify',
    isMethod: true,
    nodeify: (function() {
      // eslint-disable-next-line no-global-assign
      Promise = function() {};
      try {
        require('es-nodeify');
        return Promise.prototype.nodeify;
      } finally {
        // eslint-disable-next-line no-global-assign
        Promise = NPromise;
      }
    }()),
  },
  nodeify: {
    name: 'nodeify',
    isMethod: false,
    nodeify: require('nodeify'),
  },
  promiseNodeify: {
    name: 'promiseNodeify',
    isMethod: false,
    // https://github.com/import-js/eslint-plugin-import/issues/2844
    // eslint-disable-next-line import/extensions,n/no-unpublished-require
    nodeify: require('..'),
  },
  thenNodeify: {
    name: 'then#nodeify',
    isMethod: true,
    nodeify: require('promise').prototype.nodeify,
  },
  unthenify: {
    name: 'unthenify',
    isMethod: false,
    nodeify: (function() {
      const unthenify = require('unthenify');
      return function unthenifyNodeify(promise, callback) {
        return unthenify(() => promise)(callback);
      };
    }()),
  },
  whenNode: {
    name: 'when.bindCallback',
    isMethod: false,
    nodeify: require('when/node').bindCallback,
  },
};

/** Promise types to benchmark with human-readable name, indexed by global name
 */
const PROMISE_TYPES = {
  BBPromise: {
    name: 'bluebird',
    Promise: require('bluebird').Promise,
  },
  NPOPromise: {
    name: 'npo',
    Promise: require('native-promise-only'),
  },
  PPromise: {
    name: 'pinkie',
    Promise: require('pinkie-promise'),
  },
  QPromise: {
    name: 'q',
    Promise: require('q'),
  },
  RPromise: {
    name: 'rsvp',
    Promise: require('rsvp').Promise,
  },
  TPromise: {
    name: 'then',
    Promise: require('promise'),
  },
  WPromise: {
    name: 'when',
    Promise: require('when'),
  },
};
if (NPromise) {
  PROMISE_TYPES.NPromise = {
    name: 'native',
    Promise: NPromise,
  };
}

/** Exposes nodeify functions and promise types as globals so that they can
 * be accessed in the benchmark code.
 *
 * @private
 */
function defineGlobals() {
  for (const nodeifyName of Object.keys(NODEIFY_FUNCTIONS)) {
    global[nodeifyName] = NODEIFY_FUNCTIONS[nodeifyName].nodeify;
  }

  for (const promiseName of Object.keys(PROMISE_TYPES)) {
    global[promiseName] = PROMISE_TYPES[promiseName].Promise;
  }
}

/** Deletes the globals added by {@link defineGlobals}.
 *
 * @private
 */
function deleteGlobals() {
  for (const nodeifyName of Object.keys(NODEIFY_FUNCTIONS)) {
    delete global[nodeifyName];
  }

  for (const promiseName of Object.keys(PROMISE_TYPES)) {
    delete global[promiseName];
  }
}

function defineSuites() {
  const resolvedSuite = new Benchmark.Suite('nodeify resolved');
  const rejectedSuite = new Benchmark.Suite('nodeify rejected');

  for (const nodeifyName of Object.keys(NODEIFY_FUNCTIONS)) {
    const nodeifyFunction = NODEIFY_FUNCTIONS[nodeifyName];
    for (const promiseName of Object.keys(PROMISE_TYPES)) {
      const promiseType = PROMISE_TYPES[promiseName];

      resolvedSuite.add(
        `${nodeifyFunction.name} with ${promiseType.name}`,
        {
          defer: true,
          fn: nodeifyFunction.isMethod
            ? 'promise.nodeify(function() { deferred.resolve(); });'
            : `${nodeifyName}(promise, function() { deferred.resolve(); });`,
          // Expose deferred on benchmark so we can recover from errors.
          // See https://github.com/bestiejs/benchmark.js/issues/123
          // eslint-disable-next-line prefer-template
          setup: 'this.benchmark._original.deferred = deferred;\n'
            + `var promise = ${promiseName}.resolve(true);\n`
            + (nodeifyFunction.isMethod
              ? `promise.nodeify = ${nodeifyName};` : ''),
        },
      );

      rejectedSuite.add(
        `${nodeifyFunction.name} with ${promiseType.name}`,
        {
          defer: true,
          fn: nodeifyFunction.isMethod
            ? 'promise.nodeify(function() { deferred.resolve(); });'
            : `${nodeifyName}(promise, function() { deferred.resolve(); });`,
          // Expose deferred on benchmark so we can recover from errors.
          // See https://github.com/bestiejs/benchmark.js/issues/123
          setup: `${'this.benchmark._original.deferred = deferred;\n'
            + 'var promise = '}${promiseName}.reject(new Error());\n${
            nodeifyFunction.isMethod
              ? `promise.nodeify = ${nodeifyName};` : ''}`,
        },
      );
    }
  }

  return [resolvedSuite, rejectedSuite];
}

function formatResultsTxt(suite, useColor) {
  const rowNames = Object.keys(NODEIFY_FUNCTIONS)
    .map((funcName) => NODEIFY_FUNCTIONS[funcName].name);
  const colNames = Object.keys(PROMISE_TYPES)
    .map((promiseName) => PROMISE_TYPES[promiseName].name);

  const numRows = rowNames.length;
  const numCols = colNames.length;
  assert.strictEqual(suite.length, numRows * numCols);

  let tableValues =
    suite.map(
      (bench) => (bench.error ? bench.error.name : bench.hz.toLocaleString()),
    );
  if (useColor) {
    const numberValues = suite
      .filter((bench) => !bench.error)
      .map((bench) => bench.hz);

    const stats = new Stats();
    stats.push(numberValues);
    const lowerQuartile = stats.percentile(25);
    const upperQuartile = stats.percentile(75);

    const tableColors = suite.map((bench) => (bench.error ? colors.red
      : bench.hz < lowerQuartile ? colors.red
        : bench.hz > upperQuartile ? colors.green
          : colors.yellow));
    tableValues = tableValues.map((value, i) => tableColors[i](value));
  }

  const table = new CliTable({
    chars: {
      bottom: '',
      'bottom-left': '',
      'bottom-mid': '',
      'bottom-right': '',
      left: '',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      middle: '|',
      right: '',
      'right-mid': '',
      top: '',
      'top-left': '',
      'top-mid': '',
      'top-right': '',
    },
    head: ['ops/sec', ...colNames],
    style: {
      head: useColor ? ['white', 'bold'] : [],
    },
  });
  if (!useColor) {
    const headMarkers = colNames.map((name) => {
      const line = '--------------------'.slice(0, Math.max(name.length, 3));
      return `${line}:`;
    });
    table.push(['-------', ...headMarkers]);
  }
  for (const [i, rowName] of rowNames.entries()) {
    const rowValues = tableValues.slice(i * numCols, (i + 1) * numCols);
    table.push([rowName, ...rowValues]);
  }
  return table.toString();
}

function runSuite(suite, options, cb) {
  let currentBenchmark;
  function onBenchmarkError(err) {
    // Set the error property of the benchmark, as the internals would do
    currentBenchmark.error = err;
    // Call .abort() so that further cycles will not be done for this Benchmark
    currentBenchmark.abort();
    // Call .resolve() to signal this cycle has finished
    currentBenchmark.deferred.resolve();
  }
  function onBenchmarkTimeout() {
    onBenchmarkError(new Error('Timeout'));
  }
  let benchmarkTimeout;
  function benchmarkStart() {
    assert(!currentBenchmark, 'concurrent benchmarks not supported');
    currentBenchmark = this;  // eslint-disable-line unicorn/no-this-assignment
    process.once('uncaughtException', onBenchmarkError);
    benchmarkTimeout = setTimeout(onBenchmarkTimeout, 10000);
  }
  function benchmarkComplete() {
    clearTimeout(benchmarkTimeout);
    benchmarkTimeout = undefined;
    process.removeListener('uncaughtException', onBenchmarkError);
    currentBenchmark = undefined;
  }
  for (const bench of suite) {
    bench.on('start', benchmarkStart);
    bench.on('complete', benchmarkComplete);
  }

  function done(...args) {
    for (const bench of suite) {
      bench.off('start', benchmarkStart);
      bench.off('complete', benchmarkComplete);
    }
    deleteGlobals();
    return cb.apply(this, args);
  }

  suite
    .on('abort', () => {
      done(new Error('Aborted'));
    })
    .on('cycle', (evt) => {
      const bench = evt.target;
      // Workaround for https://github.com/bestiejs/benchmark.js/pull/122
      options.out.write(
        `${bench.error ? `${bench.name}: ${bench.error}` : String(bench)}\n`,
      );
    })
    .on('complete', function() {
      done(undefined, this);
    });

  defineGlobals();

  suite.run();
}

function nodeifyBenchmark(args, options, callback) {
  const suites = defineSuites();

  function runNext() {
    if (suites.length === 0) {
      callback();
      return;
    }

    const suite = suites.shift();
    runSuite(suite, options, (err) => {
      if (err) {
        callback(err);
        return;
      }

      options.out.write(`${formatResultsTxt(suite, process.stdout.isTTY)}\n`);
      runNext();
    });
  }

  runNext();
}

module.exports = nodeifyBenchmark;
module.exports.defineSuites = defineSuites;
module.exports.runSuite = runSuite;

if (require.main === module) {
  // This file was invoked directly.
  /* eslint-disable no-process-exit,unicorn/no-process-exit */
  const mainOptions = {
    in: process.stdin,
    out: process.stdout,
    err: process.stderr,
  };
  nodeifyBenchmark(process.argv, mainOptions, (err, code) => {
    if (err) {
      if (err.stdout) { process.stdout.write(err.stdout); }
      if (err.stderr) { process.stderr.write(err.stderr); }
      process.stderr.write(`${err.name}: ${err.message}\n`);

      code = typeof err.code === 'number' ? err.code : 1;
    }

    process.exit(code);
  });
}
