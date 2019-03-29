var merge = require('webpack-merge');

var buildProps = require('./webpack.properties.js');

var WEBPACK_MODE = buildProps.MODE_PRODUCTION;

var devConfig = require('./webpack.dev.js');
var commonConfig = require('./webpack.common.js')(WEBPACK_MODE);

module.exports = function (env, argv) {

    devConfig = devConfig(env, argv);  // Don't generate devConfig until we have the env and argv to pass in

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

    loaderConfig = merge(loaderConfig, commonConfig);
    pluginConfig = merge(pluginConfig, commonConfig);

    return devConfig.concat([loaderConfig, pluginConfig]);
};
