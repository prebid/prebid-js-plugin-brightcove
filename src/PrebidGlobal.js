// if $$PREBID_GLOBAL$$ already exists in global document scope, use it, if not, create the object
// global definition should happen BEFORE imports to avoid global undefined errors.
window.$$PREBID_GLOBAL$$ = (window.$$PREBID_GLOBAL$$ || {});

var _localPBJS = {};

module.exports = {
  getGlobal: function () {
    return window.$$PREBID_GLOBAL$$;
  },
  getLocal: function () {
    return _localPBJS;
  }
};
