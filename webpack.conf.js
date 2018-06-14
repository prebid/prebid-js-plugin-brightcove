var path = require('path');

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
