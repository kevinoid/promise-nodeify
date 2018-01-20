/**
 * @copyright Copyright 2016 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const gulp = require('gulp');
const pump = require('pump');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const umd = require('gulp-umd');

const DIST_DIR = 'dist';

gulp.task('default', (done) => {
  pump(
    gulp.src('index.js'),
    rename({basename: 'promise-nodeify'}),
    umd({
      exports() { return 'promiseNodeify'; },
      namespace() { return 'promiseNodeify'; }
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
