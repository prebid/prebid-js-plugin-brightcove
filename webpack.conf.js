var path = require("path");

// webpack.config.js for build
module.exports = {
    entry: './src/ApnPrebidVast.js',
    output: {
        path: path.join(__dirname, "dist"),
        filename: "apn_bc_prebid_vast.js",
        chunkFilename: "[chunkhash].js",
        library: "APNVideo_PrebidVastPlugin",
        libraryTarget: "var"
    },
    plugins: [
/*    
    new webpack.optimize.UglifyJsPlugin({
       minimize: false,
      sourceMap: false,
        //beautify: true
    }) 
*/

    ],
    module: {
        preLoaders: [{
            test: /\.js$/, // include .js files 
            exclude: /node_modules/, // exclude any and all files in the node_modules folder 
            loader: "jshint-loader"
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

        baseDirectoryOrIncludes: ".",
        defines: {
            'foo': true,
            'bar': 1
        }
    },

    jshint: {
        // any jshint option http://www.jshint.com/docs/options/ 

        'bitwise': 'true',
        'curly': 'true',
        'scripturl': 'false',
        //'enforceall':'false',
        //since we are never orriding Prootype (we control all this code)
        //I am ok letting this be false in the name of faster code execution
        'forin': false,
        'eqeqeq': true,
        //'es3':true,
        //'es5':true,
        'freeze': true,
        'futurehostile': true,
        //'latedef': true,
        'maxerr': '1000',
        'noarg': true,
        'nocomma': true,
        'nonbsp': true,
        'nonew': true,
        'notypeof': true,
        //excessive parens are ok as long as they increase code readability
        //and help to prevent errors, especially when helping to provide
        //structure to long conditonal statements
        'singleGroups': false,
        'undef': true,
        'unused': true,
        'globals': {
            'ActiveXObject': false,
            'APNVideo_MediationQueue': true,
            'APNVideo_VideoPlayerLoader':true,
            'APNVideo_VastVideoPlayer':true
        },
        'browser': true,
        'devel': true,



        // jshint errors are displayed by default as warnings 
        // set emitErrors to true to display them as errors 
        emitErrors: false,

        // jshint to not interrupt the compilation 
        // if you want any file with jshint errors to fail 
        // set failOnHint to true 
        failOnHint: false,


    },
    jscs: {
        "excludeFiles": [""],
        //"validateQuoteMarks": "'",
        "disallowNewlineBeforeBlockStatements": true

    }

};
