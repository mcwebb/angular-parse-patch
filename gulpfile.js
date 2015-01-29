// Include gulp
var gulp = require('gulp');

// Include Our Plugins
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var ngAnnotate = require('gulp-ng-annotate');

// Lint Task
gulp.task('lint', function() {
    gulp.src('./src/angular-parse-patch.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('uglify', function() {
    gulp.src('./src/angular-parse-patch.js')
    	.pipe(ngAnnotate())
        .pipe(uglify({ mangle: false }))
        .pipe(gulp.dest('./dist'));
});

// Default Task
gulp.task('default', ['lint', 'uglify']);
