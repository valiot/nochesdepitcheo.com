// Dependencies
var gulp          = require('gulp');
var stylus        = require('gulp-stylus');
var postcss       = require('gulp-postcss');
var cssmin        = require('gulp-cssmin');
var imagemin      = require('gulp-imagemin');
var rename        = require('gulp-rename');
var concat        = require('gulp-concat');
var uglify        = require('gulp-uglify');
var babel         = require('gulp-babel');
var rupture       = require('rupture');
var lost          = require('lost');
var rucksack      = require('rucksack-css');
var autoprefixer  = require('autoprefixer');
var browserSync   = require('browser-sync').create();
var reload        = browserSync.reload;

// Include paths file.
var paths = require('./paths');

// stylus - Compiles stylus file.
gulp.task('stylus', function() {
  var stylus_options = {
    use : [
        rupture()
    ]
  }

  return gulp.src(paths.stylusMain)
    .pipe(stylus(stylus_options))
    .pipe(gulp.dest(paths.cssFolder));
});

// postcss - Run postcss processors.
gulp.task('postcss', function() {
  var processors = [
    rucksack,
    lost,
    autoprefixer ({
      browsers:['last 2 version']
    })
  ];

  return gulp.src(paths.cssMain)
    .pipe(postcss(processors))
    .pipe(gulp.dest(paths.cssFolder))
});

// mincss - Minify app.css file.
gulp.task ('mincss', function() {
  return gulp.src(paths.cssMain)
    .pipe(cssmin())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest(paths.cssFolder));
});

// Styles:watch Task - Reloads html files
gulp.task('styles:watch', function(){
  return gulp.src(paths.stylusFiles)
    .pipe(reload({ stream:true }));
});

// styles - Run styles tasks.
gulp.task('styles', gulp.series('stylus', 'postcss', 'mincss', 'styles:watch'));

// concatjs - Concatenates *.js files.
gulp.task ('concatjs', function() {
  return gulp.src([paths.jsVendor, paths.jsModules])
    .pipe(babel())
    .pipe(concat('main.js'))
    .pipe(gulp.dest(paths.jsFolder));
});

// scripts - Run scripts tasks.
gulp.task('scripts', gulp.series('concatjs', 'uglify', 'scripts:watch'));

// images - Optimize images.
gulp.task('imageOptim', function() {
  return gulp.src(paths.imgFiles)
    .pipe(imageOptim.optimize())
    .pipe(gulp.dest(paths.imgFolder));
});

// Images - Run images tasks.
gulp.task('images', gulp.series('imageOptim'));

// server task - Run server
gulp.task('server', function() {
  browserSync.init({
    server: paths.siteDir,
    port: 3000,
    browser: "google chrome"
  });

  gulp.watch(paths.htmlFiles).on('change', reload);                   // Watch html
  gulp.watch(paths.stylusFiles, gulp.series('styles'));               // Watch styles
  gulp.watch(paths.jsModules, gulp.series('scripts'));                // Watch scripts
  gulp.watch(paths.jsVendor, gulp.series('scripts'));                 // Watch scripts
});

// build - Builds assets
gulp.task('build', gulp.series('styles', 'scripts'));

// Develop Task
gulp.task('develop', gulp.series('build', 'server'));

// Default Task
gulp.task('default', gulp.series('develop'));