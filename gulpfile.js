var gulp = require('gulp');
var gutil = require('gulp-util');
var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');
var fs = require('fs');
var rename = require('gulp-rename');
var eslint = require('gulp-eslint');
var gulpWebpack = require('gulp-webpack');
var preprocess = require('gulp-preprocess');
var header = require('gulp-header');
var cp = require('child_process');
var replace = require('gulp-replace');
var webpackConfig = require('./webpack.conf.js');
var webpackConfigPlugin = require('./webpack.conf.plugin.js');
var pkg = require('./package.json');

var versionText = 'v' + pkg.version;

var licenseHeaders = fs.readFileSync('license-bc-prebid.txt');

var curDateObj = new Date();

var copyrightText = '(c)' + curDateObj.getUTCFullYear() + ' PREBID.ORG, INC.';

var bannerText = '/*! ' + copyrightText + ' ' + versionText + '\n' + licenseHeaders + '*/\n';

// start build shim
gulp.task('webpack:build', function(callback) {
    return gulpWebpack(require('./webpack.conf.js'))
        .pipe(replace('</script>', '<\\/script>'))
    	.pipe(preprocess())
        .pipe(gulp.dest('dist/'));
});

gulp.task('webpack:build-min', function(callback) {
    webpackConfig.plugins.push(new webpack.optimize.UglifyJsPlugin({
       minimize: false,
      sourceMap: false
    }));
   return gulpWebpack(webpackConfig)
       .pipe(replace('</script>', '<\\/script>'))
       .pipe(preprocess())
       .pipe(header(bannerText))
       .pipe(rename({suffix: '.min'}))
       .pipe(gulp.dest('dist/'));
});
// end build shim

// start build plugin
gulp.task('webpack:build-plugin', function(callback) {
    return gulpWebpack(require('./webpack.conf.plugin.js'))
    	.pipe(preprocess())
        .pipe(gulp.dest('dist/'));
});

gulp.task('webpack:build-plugin-min', function(callback) {
    webpackConfigPlugin.plugins.push(new webpack.optimize.UglifyJsPlugin({
       minimize: false,
      sourceMap: false
    }));
   return gulpWebpack(webpackConfigPlugin)
       .pipe(preprocess())
       .pipe(header(bannerText))
       .pipe(rename({suffix: '.min'}))
       .pipe(gulp.dest('dist/'));
});
// end build plugin

gulp.task('lint', () => {
    return gulp.src(['src/**/*.js', 'tests/e2e/auto/**/*.js'])
      .pipe(eslint())
      .pipe(eslint.format('stylish'))
      .pipe(eslint.failAfterError());
});

gulp.task('test', function () {
    return cp.execFile('./test.sh', function(error, stdout, stderr) {
        console.log(stdout);
    });
});

gulp.task('dev-server', function(callback) {
    // modify some webpack config options
    var myConfig = Object.create(webpackConfig);
    myConfig.devtool = 'eval';
    myConfig.debug = true;

    const debugPort = 8082;

    // Start a webpack-dev-server
    // note- setting "publicPath" to /dist/ hides the actual
    // dist folder.  When webpack-dev-server runs, it does a webpack build
    // of the module in memory, not on disk into /dist/  This allows us to do live-rebuilds duing development time
    // to build to the actual dist folder, you need to run the webpack gulp task
    // note that the pages in the testPages folder point to ../../../dist/ModuleName.js
    // this is so they can run standalone outside of the webpack dev server, and when webpack-dev-server server the file
    // moving up levels doesn't matter because we are already at the webserver root
    new WebpackDevServer(webpack(myConfig), {
        publicPath: '/dist/',
        contentBase: './tests/e2e/testPages/',
        hot: true,
        stats: {
            colors: true
        }
    }).listen(debugPort, 'local.prebid', function(err) {
        if (err) throw new gutil.PluginError('webpack-dev-server', err);
        gutil.log('[webpack-dev-server]', 'Webpack Dev Server Started at: http://local.prebid:' + debugPort + '/webpack-dev-server/');
    });
});

gulp.task('default', ['lint', 'webpack:build', 'webpack:build-min', 'webpack:build-plugin', 'webpack:build-plugin-min', 'test']);

var Server = require('karma').Server;

gulp.task('ci-test', function(done) {
    console.log('DIRNAME = ', __dirname);
    new Server({
        configFile: __dirname + '/karma.conf.ci.js',
        autoWatch: false,
        singleRun: true,
        browsers: ['Chrome_travis_ci'],
        reporters: ['spec', 'coverage'],
        customLaunchers: {
          Chrome_travis_ci: {
            base: 'Chrome',
            flags: ['--no-sandbox']
          }
        },
        coverageReporter: {
            reporters: [
            {
                type: 'text',
                dir: 'coverage/',
                file: 'coverage.txt'
            },
            {
                type: 'html',
                dir: 'coverage/'
            },
            {
                type: 'lcovonly',
                dir: 'coverage/',
                subdir: '.'
            },
            {type: 'text-summary'}
            ]
        }
        }, function (error) {
        done(error);
      }).start();
});
