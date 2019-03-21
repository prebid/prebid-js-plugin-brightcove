var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var gulp = require('gulp');
var gutil = require('gulp-util');
var Server = require('karma').Server;
var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');

var webpack_config_dev = require('./webpack.dev.js')(null, null);
var webpack_config_prod = require('./webpack.prod.js')(null, null);

var getWebpackCallback = function getWebpackCallback (done) {
    return function (err, stats) {
        if (err) {
            throw new gutil.PluginError('webpack', err);
        }
        else {
            gutil.log('=================== Webpack Build Report ===================\n', stats.toString());
        }
        done();
    }
};

gulp.task('build-dev', function (done) {
    webpack(webpack_config_dev, getWebpackCallback(done));
});

gulp.task('build-prod', function (done) {
    webpack(webpack_config_prod, getWebpackCallback(done));
});

gulp.task('copy-css', function (done) {
    gulp.src('./src/styles/*.css')
    .pipe(gulp.dest('./dist/styles/'));
    done();
});

gulp.task('test', function (done) {
    new Server({
        configFile: path.join(__dirname, 'karma.conf.js')
    }, function (err) {
        console.log('===================== Karma: Unit tests ' + (err > 0 ? 'FAILED' : 'PASSED') + '! ===================== ');
        done();
    }).start();
});

// NOTE: This task must be defined after the tasks it depends on
gulp.task('default', gulp.series('build-prod', 'copy-css', 'test'));

// NOTE: This task must be defined after the tasks it depends on
gulp.task('build', gulp.series('build-prod', 'copy-css', 'test'));


gulp.task('dev-server', function (callback) {

    var debugPort = 8082;
    var target_entry = 'http://local.prebid.com:' + debugPort + '/prebid-main.html';

    // Start a webpack-dev-server
    // note- setting "publicPath" to /dist/ hides the actual
    // dist folder.  When webpack-dev-server runs, it does a webpack build
    // of the module in memory, not on disk into /dist/  This allows us to do live-rebuilds during development time
    // to build to the actual dist folder, you need to run the webpack gulp task
    // note that the pages in the testPages folder point to ../../../dist/ModuleName.js
    // this is so they can run standalone outside of the webpack dev server, and when webpack-dev-server server the file
    // moving up levels doesn't matter because we are already at the webserver root

    var wp = webpack(webpack_config_dev);
    new WebpackDevServer(wp, {
        publicPath: '/dist/',
        contentBase: './tests/e2e/testPages/',
        hot: false,
        stats: {
            colors: true
        }
    }).listen(debugPort, 'local.prebid.com', function (err) {
        if (err) throw new gutil.PluginError('webpack-dev-server', err);
        gutil.log('[webpack-dev-server]', 'Webpack Dev Server Started at: ' + target_entry);
    });
});

gulp.task('ci-test', function (done) {
    console.log('DIRNAME = ', __dirname);
    new Server({
        configFile: path.join(__dirname, 'karma.conf.ci.js'),
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
