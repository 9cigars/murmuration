/* Murmuration: the Hugging Face mood pass.
 * When a file arrives with no sentiment column, this downloads a sentiment model from huggingface.co and runs it
 * inside the visitor's browser, one post at a time. The model comes to the data, so no post is sent anywhere. */
(function (root) {
  'use strict';
  var LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
  var MODEL = 'Xenova/twitter-roberta-base-sentiment-latest', SWITCH = 'murmuration-hub', pipe = null;

  function enabled() { try { return localStorage.getItem(SWITCH) !== 'off'; } catch (e) { return true; } }
  function pause() { return new Promise(function (r) { setTimeout(r, 0); }); }

  function ready(onLoad) {
    if (pipe) return Promise.resolve(pipe);
    return import(LIB).then(function (T) {
      T.env.allowLocalModels = false;
      var size = {}, got = {};
      return T.pipeline('sentiment-analysis', MODEL, {
        dtype: 'q8', device: 'wasm',
        progress_callback: function (p) {
          if (p.status !== 'progress' || !p.total) return;
          size[p.file] = p.total; got[p.file] = p.loaded;
          var a = 0, b = 0; Object.keys(size).forEach(function (k) { a += got[k]; b += size[k]; });
          if (onLoad) onLoad(a, b);
        }
      });
    }).then(function (p) { pipe = p; return p; });
  }

  /* Reads each distinct text once. Returns a Map of text to label for everything it got through before being stopped. */
  function read(texts, opts) {
    opts = opts || {};
    var list = Array.from(new Set(texts)), out = new Map();
    return ready(opts.onLoad).then(function (p) {
      var t0 = performance.now(), i = 0;
      function next() {
        if (i >= list.length || (opts.stop && opts.stop.now)) return out;
        return p(list[i].slice(0, 500)).then(function (r) {
          out.set(list[i], String(r[0].label).toLowerCase()); i++;
          if (opts.onRead) opts.onRead(i, list.length, (performance.now() - t0) / i);
          return pause().then(next);
        });
      }
      return next();
    });
  }

  /* Graded offline with the same library and settings on the hand-labelled exams the built-in reader sits. */
  var METRICS = { tweets: { n: 359, accuracy: 92.8 }, reviews: { n: 3000, accuracy: 95.0 }, three: { n: 498, accuracy: 86.5 } };
  root.Hub = { MODEL: MODEL, enabled: enabled, read: read, METRICS: METRICS };
})(window);
