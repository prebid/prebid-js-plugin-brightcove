var path = require('path');
var merge = require('webpack-merge');
var CleanWebpackPlugin = require('clean-webpack-plugin');

var WP_MODE = 'development';

var commonConfig = require('./webpack.common.js')(WP_MODE);

var LOADER_ENTRY_FILE = './src/BcPrebidLoader.js';
var LOADER_OUTPUT_FILE = 'bc_prebid_vast.js';
var LOADER_VAR_NAME = 'BCVideo_PrebidVastPlugin';

var PLUGIN_ENTRY_FILE = './src/BcPrebidVast.js';
var PLUGIN_OUTPUT_FILE = 'bc_prebid_vast_plugin.js';
var PLUGIN_VAR_NAME = 'BCVideo_PrebidVastMainPlugin';


module.exports = function (env, argv) {

    var cleanConfig = {
        plugins: [
            new CleanWebpackPlugin()
        ]
    };

    var loaderConfig = {
        mode: WP_MODE,
        entry: LOADER_ENTRY_FILE,
        devtool: 'eval-source-map',
        output: {
            path: path.join(__dirname, 'dist'),
            filename: LOADER_OUTPUT_FILE,
            libraryTarget: 'var',
            library: LOADER_VAR_NAME,
        }
    };

    var pluginConfig = {
        mode: WP_MODE,
        entry: PLUGIN_ENTRY_FILE,
        devtool: 'eval-source-map',
        output: {
            path: path.join(__dirname, 'dist'),
            filename: PLUGIN_OUTPUT_FILE,
            libraryTarget: 'var',
            library: PLUGIN_VAR_NAME,
        }
    };

    loaderConfig = merge(loaderConfig, commonConfig, cleanConfig);
    pluginConfig = merge(pluginConfig, commonConfig);

    // console.log('---------------------------------------------');
    // traceObj(loaderConfig);
    // console.log('---------------------------------------------');
    // traceObj(pluginConfig);
    // console.log('---------------------------------------------');

    return [loaderConfig, pluginConfig];
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
