var path = require('path');
var stringReplacePlugin = require('string-replace-webpack-plugin');
var plugin = require('./package.json');

// webpack.config.js for build
module.exports = {
    entry: './src/BcPrebidVast.js',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'bc_prebid_vast.js',
        chunkFilename: '[chunkhash].js',
        library: 'BCVideo_PrebidVastPlugin',
        libraryTarget: 'var'
    },
    plugins: [
    ],
    module: {
        preLoaders: [{
            test: /\.js$/, // include .js files
            exclude: /node_modules/, // exclude any and all files in the node_modules folder
            loader: 'jshint-loader'
        }, {
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'jscs-loader'
        }, {
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'preprocessor-loader'
        }, {
            test: /\.js$/,
            include: /(src|tests)/,
            loader: stringReplacePlugin.replace({
              replacements: [
                {
                  pattern: /\$\$PREBID_GLOBAL\$\$/g,
                  replacement: function (match, p1, offset, string) {
                    return plugin.globalVarName;
                  }
                }
              ]
            })
        }]
    },

    preprocessor: {

        baseDirectoryOrIncludes: '.',
        defines: {
            'foo': true,
            'bar': 1
        }
    },

    jscs: {
        'excludeFiles': [''],
        'disallowNewlineBeforeBlockStatements': true
    }
};
