/**
 * @copyright Copyright 2016 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

var gulp = require('gulp');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var umd = require('gulp-umd');

var DIST_DIR = 'dist';

gulp.task('default', function() {
  return gulp.src('index.js')
    .pipe(rename({basename: 'promise-nodeify'}))
    .pipe(umd({
      exports: function() { return 'promiseNodeify'; },
      namespace: function() { return 'promiseNodeify'; }
    }))
    .pipe(gulp.dest(DIST_DIR))
    .pipe(sourcemaps.init())
      .pipe(uglify({output: {comments: 'some'}}))
      .pipe(rename({extname: '.min.js'}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(DIST_DIR));
});
