var merge = require('webpack-merge');
var CleanWebpackPlugin = require('clean-webpack-plugin');

var buildProps = require('./webpack.properties.js');

var WEBPACK_MODE = buildProps.MODE_DEVELOPMENT;

var commonConfig = require('./webpack.common.js')(WEBPACK_MODE);

module.exports = function (env, argv) {

    var cleanConfig = {
        plugins: [
            new CleanWebpackPlugin()
        ]
    };

    var loaderConfig = {
        mode: WEBPACK_MODE,
        entry: buildProps.loader.entry_file,
        devtool: buildProps.devTool[WEBPACK_MODE],
        output: {
            path: buildProps.output.path,
            filename: buildProps.loader.output_file[WEBPACK_MODE],
            libraryTarget: buildProps.plugin.libraryTarget,
            library: buildProps.loader.var_name
        }
    };

    var pluginConfig = {
        mode: WEBPACK_MODE,
        entry: buildProps.plugin.entry_file,
        devtool: buildProps.devTool[WEBPACK_MODE],
        output: {
            path: buildProps.output.path,
            filename: buildProps.plugin.output_file[WEBPACK_MODE],
            libraryTarget: buildProps.plugin.libraryTarget,
            library: buildProps.plugin.var_name
        }
    };

    loaderConfig = merge(loaderConfig, commonConfig, cleanConfig);
    pluginConfig = merge(pluginConfig, commonConfig);

    return [loaderConfig, pluginConfig];
};
