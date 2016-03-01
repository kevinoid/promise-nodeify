/**
 * Extracted awaitGlobalException from
 * https://github.com/petkaantonov/bluebird/blob/8014affe492b812b82b0aeb43b218fc2ca3e1fd0/test/mocha/helpers/util.js
 *
 * Asked about publishing it as a module in
 * https://groups.google.com/d/msg/bluebird-js/Qmk8qSPJ8hY/fEhOnQEjAwAJ
 *
 * @copyright Copyright 2015-2016 Petka Antonov
 * @copyright Copyright 2015 Anatoly Ressin
 * @license MIT
 */
'use strict';

var Promise = require('bluebird').Promise;

function awaitGlobalException(fn) {
    function replaceListeners(by) {
        var single = typeof by === "function";
        if (process.title === "browser") {
            var original = window.onerror;
            window.onerror = single ? function(message, file, line, column, e) {
                return by(e);
            } : by[0];
            return [original];
        } else {
            var original = process.listeners("uncaughtException");
            process.removeAllListeners("uncaughtException");
            if (single) by = [by];
            by.forEach(function(listener) {
                process.on("uncaughtException", listener);
            });
            return original;
        }
    }
    return new Promise(function(resolve, reject) {
        var listeners = replaceListeners(function(e) {
            var err;
            var ret;
            try {
                ret = fn(e);
            } catch (e) {
                err = e;
            }
            if (!err && ret === false) return;
            replaceListeners(listeners);
            Promise.delay(1).then(function() {
                if (err) reject(err);
                resolve();
            });
        });
    });
}

module.exports = awaitGlobalException;
