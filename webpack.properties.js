var fs = require('fs');
var path = require('path');
var webpack = require('webpack');

// For build comments at top of file
var pkg = require('./package.json');

var versionText = 'v' + pkg.version;
var loaderVersionText = 'v' + pkg.loaderVersion;

var licenseHeaders = fs.readFileSync('license-bc-prebid.txt');

var curDateObj = new Date();

var copyrightText = '(c)' + curDateObj.getUTCFullYear() + ' PREBID.ORG, INC.';

var loaderBannerText = copyrightText + ' ' + loaderVersionText + '\n' + licenseHeaders;
var pluginBannerText = copyrightText + ' ' + versionText + '\n' + licenseHeaders;


var PROPS = {

    MODE_DEVELOPMENT: 'development',
    MODE_PRODUCTION: 'production',

    /* SHARED PROPERTIES */

    globalVarName: 'bc_plugin_pbjs',

    output: {
        path: path.join(__dirname, 'dist')
    },

    // 'devTool' sets the type of source maps used - see docs here: https://webpack.js.org/configuration/devtool
    devTool: {
        development: 'eval-source-map',
        production: 'none',
    },

    /* LOADER PROPERTIES */

    loader: {
        entry_file: './src/BcPrebidLoader.js',
        output_file: {
            development: 'bc_prebid_vast.js',
            production: 'bc_prebid_vast.min.js',
        },
        libraryTarget: 'var',
        var_name: 'BCVideo_PrebidVastPlugin',
        bannerText: loaderBannerText
    },

    /* PLUGIN PROPERTIES */

    plugin: {
        entry_file: './src/BcPrebidVast.js',
        output_file: {
            development: 'bc_prebid_vast_plugin.js',
            production: 'bc_prebid_vast_plugin.min.js',
        },
        libraryTarget: 'var',
        var_name: 'BCVideo_PrebidVastMainPlugin',
        bannerText: pluginBannerText
    },

    /* UTIL FUNCTIONS */

    util: {
        traceObj: function (obj, depth) {
            depth = depth || 0;
            var space = new Array(depth + 2).join('==') + '> ';
            for (var k in obj) {
                console.log(space + k + ' --> ' + obj[k]);
                if (typeof obj[k] === 'object') {
                    traceObj(obj[k], depth + 1);
                    continue;
                }
            }
        }
    }
};

module.exports = PROPS;
