/**
 * @copyright Copyright 2016 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

var gulp = require('gulp');
var pump = require('pump');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var umd = require('gulp-umd');

var DIST_DIR = 'dist';

gulp.task('default', function(done) {
  pump(
    gulp.src('index.js'),
    rename({basename: 'promise-nodeify'}),
    umd({
      exports: function() { return 'promiseNodeify'; },
      namespace: function() { return 'promiseNodeify'; }
    }),
    gulp.dest(DIST_DIR),
    sourcemaps.init(),
      uglify({output: {comments: 'some'}}),
      rename({extname: '.min.js'}),
    sourcemaps.write('.'),
    gulp.dest(DIST_DIR),
    done
  );
});
