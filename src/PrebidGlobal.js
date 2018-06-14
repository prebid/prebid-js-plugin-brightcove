// if $$PREBID_GLOBAL$$ already exists in global document scope, use it, if not, create the object
// global definition should happen BEFORE imports to avoid global undefined errors.
window.bc_plugin_pbjs = (window.bc_plugin_pbjs || {});

module.exports = {
  getGlobal: function() {
    return window.bc_plugin_pbjs;
  }
};
