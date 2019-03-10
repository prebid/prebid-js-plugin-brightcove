var path = require('path');
var merge = require('webpack-merge');

var WEBPACK_MODE = 'production';

var LOADER_ENTRY_FILE = './src/BcPrebidLoader.js';
var LOADER_OUTPUT_FILE = 'bc_prebid_vast.min.js';
var LOADER_VAR_NAME = 'BCVideo_PrebidVastPlugin';

var PLUGIN_ENTRY_FILE = './src/BcPrebidVast.js';
var PLUGIN_OUTPUT_FILE = 'bc_prebid_vast_plugin.min.js';
var PLUGIN_VAR_NAME = 'BCVideo_PrebidVastMainPlugin';

var devConfig = require('./webpack.dev.js');
var commonConfig = require('./webpack.common.js')(WEBPACK_MODE);

module.exports = function (env, argv) {

    devConfig = devConfig(env, argv);  // Don't generate devConfig until we have the env and argv to pass in

    var loaderConfig = {
        mode: WEBPACK_MODE,
        entry: LOADER_ENTRY_FILE,
        devtool: 'none',
        output: {
            path: path.join(__dirname, 'dist'),
            filename: LOADER_OUTPUT_FILE,
            libraryTarget: 'var',
            library: LOADER_VAR_NAME,
        }
    };

    var pluginConfig = {
        mode: WEBPACK_MODE,
        entry: PLUGIN_ENTRY_FILE,
        devtool: 'none',
        output: {
            path: path.join(__dirname, 'dist'),
            filename: PLUGIN_OUTPUT_FILE,
            libraryTarget: 'var',
            library: PLUGIN_VAR_NAME,
        }
    };

    loaderConfig = merge(loaderConfig, commonConfig);
    pluginConfig = merge(pluginConfig, commonConfig);

    // console.log('---------------------------------------------');
    // traceObj(loaderConfig);
    // console.log('---------------------------------------------');
    // traceObj(pluginConfig);
    // console.log('---------------------------------------------');

    return devConfig.concat([loaderConfig, pluginConfig]);
};

/*
var traceObj = function (obj, depth) {
    depth = depth || 0;

    var space = new Array(depth + 2).join('==') + '> ';

    for (var k in obj) {

        console.log(space + k + ' --> ' + obj[k]);
        if (typeof obj[k] === 'object') {
            traceObj(obj[k], depth + 1);
            continue;
        }
    }
};
*/
