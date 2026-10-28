/* th-kit/motion.js — standalone stub of the host motion/session kit.
   Provides window.th with:
     - th.ready()            : resolves when the kit is initialized
     - th.session.get/set    : namespaced localStorage-backed session state
     - th.storage.get/set    : namespaced persistent state
     - th.back.push/close    : back-navigation handle stack */
(function () {
  'use strict';

  if (window.th && window.th.ready) return;

  var NS = 'th.';

  function storageStore(prefix) {
    return {
      get: function (key) {
        try {
          var raw = window.localStorage.getItem(NS + prefix + key);
          return raw === null ? null : JSON.parse(raw);
        } catch (_) {
          return null;
        }
      },
      set: function (key, value) {
        try {
          window.localStorage.setItem(NS + prefix + key, JSON.stringify(value));
        } catch (_) {
          /* storage full / unavailable */
        }
      },
      remove: function (key) {
        try {
          window.localStorage.removeItem(NS + prefix + key);
        } catch (_) {}
      }
    };
  }

  var backQueue = [];
  var back = {
    push: function (onBack) {
      var handle = {
        close: function () {
          var i = backQueue.indexOf(handle);
          if (i !== -1) backQueue.splice(i, 1);
        }
      };
      handle.onBack = onBack;
      backQueue.push(handle);
      return handle;
    },
    invoke: function () {
      var top = backQueue[backQueue.length - 1];
      if (top && typeof top.onBack === 'function') top.onBack();
    },
    clear: function () {
      backQueue.length = 0;
    }
  };

  var ready = Promise.resolve();

  window.th = {
    ready: function () {
      return ready;
    },
    session: storageStore('session.'),
    storage: storageStore('storage.'),
    back: back
  };
})();
