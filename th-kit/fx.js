/* th-kit/fx.js — tactile sound + toast feedback.
   Exposes window.fx.sound(name) for 'tap' | 'pop' | 'whoosh' and
   window.fx.toast(message, opts). */
(function () {
  'use strict';

  var ctx = null;
  var lastPlay = 0;

  function audio() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (_) {
      return null;
    }
    return ctx;
  }

  function tone(freq, opts) {
    var ac = audio();
    if (!ac) return;
    if (ac.state === 'suspended') {
      ac.resume().catch(function () {});
    }
    var now = ac.currentTime;
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    var dur = (opts && opts.duration) || 0.08;

    osc.type = (opts && opts.type) || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    if (opts && opts.endFreq) {
      osc.frequency.exponentialRampToValueAtTime(opts.endFreq, now + dur);
    }
    gain.gain.setValueAtTime((opts && opts.gain) || 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  var SOUNDS = {
    tap: function () {
      tone(880, { duration: 0.05, gain: 0.05, type: 'triangle' });
    },
    pop: function () {
      tone(520, { endFreq: 880, duration: 0.09, gain: 0.09, type: 'sine' });
    },
    whoosh: function () {
      tone(600, { endFreq: 180, duration: 0.22, gain: 0.05, type: 'sawtooth' });
    }
  };

  function sound(name) {
    // Throttle to avoid audio clutter during fast key entry.
    var now = performance.now();
    if (now - lastPlay < 28) return;
    lastPlay = now;
    var fn = SOUNDS[name] || SOUNDS.tap;
    try {
      fn();
    } catch (_) {
      /* audio unavailable — ignore */
    }
  }

  function ensureHost() {
    var host = document.querySelector('.th-toast-host');
    if (host) return host;
    host = document.createElement('div');
    host.className = 'th-toast-host';
    document.body.appendChild(host);
    return host;
  }

  function toast(message, opts) {
    if (typeof document === 'undefined') return;
    var host = ensureHost();
    var el = document.createElement('div');
    el.className = 'th-toast';
    el.setAttribute('role', 'status');
    el.textContent = String(message == null ? '' : message);
    host.appendChild(el);

    requestAnimationFrame(function () {
      el.classList.add('visible');
    });

    var stay = (opts && opts.duration) || 2400;
    setTimeout(function () {
      el.classList.remove('visible');
      el.classList.add('leaving');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 200);
    }, stay);
  }

  window.fx = {
    sound: sound,
    toast: toast,
    _audio: audio // exposed for tests / warm-up
  };
})();
