/**
 * Client Side Logging module.
 * @module Logging
 */

// Note that we have an excessive amount of try/catch blocks in this code.
// That is intentional. Logging should never break the features which are using it

var TRACE_LEVEL_SILENT = 0;
var TRACE_LEVEL_ALWAYS = 1;
var TRACE_LEVEL_ERROR = 2;
var TRACE_LEVEL_WARN = 3;
var TRACE_LEVEL_INFO = 4;
var TRACE_LEVEL_LOG = 5;
var TRACE_LEVEL_DEBUG = 6;
var TRACE_LEVEL_VERBOSE = 6;

var LOCAL_STORAGE_KEY_NAME = 'AppNexus_Page_Debug_Log_Level';

// not an actual debug level, but used as a shortcut so we always
// know what the max debug level is
var TRACE_LEVEL_ALL = TRACE_LEVEL_DEBUG;
var TRACE_LEVEL_DEFAULT = TRACE_LEVEL_SILENT;

// the current debug level to use
var _curDebugLevel = TRACE_LEVEL_DEFAULT;

// the debug level that was set via querystring
var _debugLevelQueryString = TRACE_LEVEL_DEFAULT;

// the debug level that was set via localStorage
var _debugLevelLocalStorage = TRACE_LEVEL_DEFAULT;

// the debug level that was set via call to setDebugLevel
var _debugLevelFunctionSet = TRACE_LEVEL_DEFAULT;

function getCurrentTimeString() {
    var dateToReturn = '';
    try {
        var curDate = new Date();
        dateToReturn = curDate.getHours() + ':' + curDate.getMinutes() + ':' + curDate.getSeconds() + '.' + curDate.getMilliseconds();
    } catch (e) {}
    return dateToReturn;
}

function getTraceMethodName(messageLogLevel) {
    switch (messageLogLevel) {
        case 0:
            break;
        case 1:
            return 'always';
        case 2:
            return 'error';
        case 3:
            return 'warn';
        case 4:
            return 'info';
        case 5:
            return 'log';
        case 6:
            return 'debug';
        case 7:
            return 'verbose';
        default:
            break;
    }
}

function traceMessageAtLevel(messageLogLevel, args) {
    try {
        // if method has been defined, and the correct debug level has been set, log it
        if (typeof messageLogLevel !== 'undefined' && okToLogMessage(messageLogLevel)) {
            if (console) {
                var messagePrefix = '[APN';
                var methodToUse = getTraceMethodName(messageLogLevel);

                // if console message doesn't exist, use 'log' and
                // set the original method in the message prefix
                if (!console[methodToUse]) {
                    messagePrefix += '-' + methodToUse;
                    methodToUse = 'log';
                }
                messagePrefix += ']';
                messagePrefix += '[' + getCurrentTimeString() + ']';

                args.splice(0, 0, messagePrefix);
                // from http://tobyho.com/2012/07/27/taking-over-console-log/
                if (console[methodToUse].apply) {
                    console[methodToUse].apply(console, args);
                } else {
                    var message = Array.prototype.slice.apply(args).join('');
                    console[methodToUse](message);
                }
            }
        }
    } catch (e) {}
}

// get a named parameter from the querystring
function getParameterByName(name) {
    // accesing window might fail at the browser level, we can't really test for it,
    // so there are a few nested try/catch blocks here
    try {
        var urlToSearch = '';
        // try checking the topmost window, and if not, use current window
        try {
            urlToSearch = window.top.location.search;
        } catch (e) {
            try {
                urlToSearch = window.location.search;
            } catch (e) {}
        }

        var regexS = '[\\?&]' + name + '=([^&#]*)';
        var regex = new RegExp(regexS);
        var results = regex.exec(urlToSearch);
        if (results === null) {
            return '';
        }
        return decodeURIComponent(results[1].replace(/\+/g, ' '));
    } catch (e) {
        return '';
    }
}

function parseDebugLevelInput(incomingDebugLevel) {
    var debugLevelToReturn = TRACE_LEVEL_DEFAULT;
    try {
        if (typeof incomingDebugLevel !== 'undefined') {
            var debugLevelToParseInt = parseInt(incomingDebugLevel);
            // if level is an integer, treat it as such
            if (!isNaN(debugLevelToParseInt)) {
                debugLevelToReturn = debugLevelToParseInt;
            } else {
                if (typeof incomingDebugLevel === 'boolean') {
                    if (incomingDebugLevel) {
                        debugLevelToReturn = TRACE_LEVEL_ALL;
                    } else {
                        debugLevelToReturn = TRACE_LEVEL_SILENT;
                    }
                } else {
                    // not an integer or boolean, treat it as a string
                    incomingDebugLevel = incomingDebugLevel.toUpperCase();
                    if (incomingDebugLevel === 'TRUE') {
                        debugLevelToReturn = TRACE_LEVEL_ALL;
                    } else {
                        if (incomingDebugLevel === 'FALSE') {
                            debugLevelToReturn = TRACE_LEVEL_SILENT;
                        }
                    }
                }
            }
        }
    } catch (e) {}

    return debugLevelToReturn;
}

function getLogLevelFromLocalStorage() {
    try {
        if (localStorage) {
            return localStorage.getItem(LOCAL_STORAGE_KEY_NAME);
        }
    } catch (e) {
        // default debug level is returned if the key doesn't exist.
        // https://developer.mozilla.org/en-US/docs/Web/API/Storage/getItem
        return TRACE_LEVEL_DEFAULT;
    }
}

// determine the maximum debug level from the page URL
function setDebugLevelFromPage() {
    try {
        // keep track of the new level
        _debugLevelQueryString = parseDebugLevelInput(getParameterByName('ast_debug').toUpperCase());
        _debugLevelLocalStorage = parseDebugLevelInput(getLogLevelFromLocalStorage());

        // the highest (least restrictive debug level) always wins
        _curDebugLevel = Math.max(Math.max(_debugLevelQueryString, _debugLevelLocalStorage), _curDebugLevel);
    } catch (e) {}
}

function handleSetDebugLevel(newDebugLevel) {
    try {
        // keep track of the new level
        _debugLevelFunctionSet = parseDebugLevelInput(newDebugLevel);

        // the highest (least restrictive debug level) always wins
        _curDebugLevel = Math.max(Math.max(_debugLevelQueryString, _debugLevelFunctionSet), _curDebugLevel);
    } catch (e) {}
}

function okToLogMessage(level) {
    return level <= _curDebugLevel; // getReqestedMaxDebugLevel();
}

// DEPRECATED
function tryLogMessageLegacy(level, message, source) {
    try {
        var messageToLog = '[APN-' + level + '-' + new Date().toISOString() + '] ';
        if (source !== null && source && source.length > 0) {
            messageToLog += source + '>';
        }
        messageToLog += message;

        if (okToLogMessage(level)) {
            console.log(messageToLog);
        }
    } catch (ex) {
        if (okToLogMessage(level)) {
            console.log(ex);
        }
    }
}

module.exports = {

    /**
     * Call the appropriate trace method at the given level
     * @param (string) debugLevel = Level to debug at
     */
    traceAtLevel: function() {
        try {
            if (arguments.length > 0) {
                var targetTraceLevel = arguments[0];
                var argsWithoutTraceLevel = Array.prototype.slice.call(arguments, 1);
                traceMessageAtLevel.call(this, targetTraceLevel, argsWithoutTraceLevel);
            }
        } catch (e) {}
    },

    /**
     * If the logging level for type "always" or higher is set, output message to browser's console log
     * With the [APN] prefix and styled with the browser's console "log" level trace style
     * @see https://developer.mozilla.org/en-US/docs/Web/API/console#Outputting_text_to_the_console
     * for more details about how to use console.log style logging.
     */
    always: function() {
        try {
            traceMessageAtLevel.call(this, TRACE_LEVEL_ALWAYS, Array.prototype.slice.call(arguments));
        } catch (e) {}
    },

    /**
     * If the logging level for type "error" or higher is set, output message to browser's console log
     * With the [APN] prefix and styled with the browser's console "error" level trace style
     * @see https://developer.mozilla.org/en-US/docs/Web/API/console#Outputting_text_to_the_console
     * for more details about how to use console.error style logging.
     */
    error: function() {
        try {
            traceMessageAtLevel.call(this, TRACE_LEVEL_ERROR, Array.prototype.slice.call(arguments));
        } catch (e) {}
    },

    /**
     * If the logging level for type "log" or higher is set, output message to browser's console log
     * With the [APN] prefix and styled with the browser's console "log" level trace style
     * @see https://developer.mozilla.org/en-US/docs/Web/API/console#Outputting_text_to_the_console
     * for more details about how to use console.log style logging.
     */
    log: function() {
        try {
            traceMessageAtLevel.call(this, TRACE_LEVEL_LOG, Array.prototype.slice.call(arguments));
        } catch (e) {}
    },

    /**
     * If the logging level for type "warn" or higher is set, output message to browser's console log
     * With the [APN] prefix and styled with the browser's console "warn" level trace style
     * @see https://developer.mozilla.org/en-US/docs/Web/API/console#Outputting_text_to_the_console
     * for more details about how to use console.warn style logging.
     */
    warn: function() {
        try {
            traceMessageAtLevel.call(this, TRACE_LEVEL_WARN, Array.prototype.slice.call(arguments));
        } catch (e) {}
    },

    /**
     * If the logging level for type "info" or higher is set, output message to browser's console log
     * With the [APN] prefix and styled with the browser's console "info" level trace style
     * @see https://developer.mozilla.org/en-US/docs/Web/API/console#Outputting_text_to_the_console
     * for more details about how to use console.info style logging.
     */
    info: function() {
        try {
            traceMessageAtLevel.call(this, TRACE_LEVEL_INFO, Array.prototype.slice.call(arguments));
        } catch (e) {}
    },

    /**
     * If the logging level for type "debug" or higher is set, output message to browser's console log
     * With the [APN] prefix and styled with the browser's console "debug" level trace style
     * @see https://developer.mozilla.org/en-US/docs/Web/API/console#Outputting_text_to_the_console
     * for more details about how to use console.debug style logging.
     */
    debug: function() {
        try {
            traceMessageAtLevel.call(this, TRACE_LEVEL_DEBUG, Array.prototype.slice.call(arguments));
        } catch (e) {}
    },

    /**
     * If the logging level for type "verbose" or higher is set, output message to browser's console log
     * With the [APN] prefix and styled with the browser's console "debug" level trace style
     * @see https://developer.mozilla.org/en-US/docs/Web/API/console#Outputting_text_to_the_console
     * for more details about how to use console.debug style logging.
     */
    verbose: function() {
        try {
            traceMessageAtLevel.call(this, TRACE_LEVEL_VERBOSE, Array.prototype.slice.call(arguments));
        } catch (e) {}
    },

    /**
     * @deprecated - use other logging methods in this library
     * Writes an entry to the console log if the current debug level is set to "Error", "Warn" or Debug"
     * @param (string) message = text to be written to the log
     * @param (string) source = optional string which identifies the source of the debug statement
     *      - if present, then it will be prepended to front of the string
     *      - example 1:  debug("hello") ==> <timestamp> hello
     *      - example 2:  debug("hello", "TM") ==> <timestamp> TM>hello
     */
    handleLogDebugLegacySupport: function(message, source) {
        /*
        var mainArguments = Array.prototype.slice.call(arguments);
        mainArguments.unshift("DEBUG");
        */
        try {
            tryLogMessageLegacy(TRACE_LEVEL_LOG, message, source);
        } catch (e) {}
    },

    /**
     * Sets debug level for logger
     * @param (string) level = Debug level to use
     */
    setDebugLevel: function(newLevel) {
        try {
            handleSetDebugLevel(newLevel);
        } catch (e) {}
    },

    /**
     * Checks if specified trace level will be emitted given the current trace level settings.
     * @param (Number) levelToCheck = Debug level to check
     */
    isTraceLevelActive: function(levelToCheck) {
        try {
            return okToLogMessage(levelToCheck);
        } catch (e) {
            return false;
        }
    },

    /** @constant {number} */
    TRACE_LEVEL_ALWAYS: TRACE_LEVEL_ALWAYS,

    /** @constant {number} */
    TRACE_LEVEL_ERROR: TRACE_LEVEL_ERROR,

    /** @constant {number} */
    TRACE_LEVEL_WARN: TRACE_LEVEL_WARN,

    /** @constant {number} */
    TRACE_LEVEL_INFO: TRACE_LEVEL_INFO,

    /** @constant {number} */
    TRACE_LEVEL_LOG: TRACE_LEVEL_LOG,

    /** @constant {number} */
    TRACE_LEVEL_DEBUG: TRACE_LEVEL_DEBUG,

    /** @constant {number} */
    TRACE_LEVEL_VERBOSE: TRACE_LEVEL_VERBOSE
};

// look in the query string for debug level
setDebugLevelFromPage();
