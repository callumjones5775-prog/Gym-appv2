// sw.js — minimal offline cache for the app shell.
var CACHE = "gym-coach-v2";
var ASSETS = [
  "./", "./index.html", "./css/style.css",
  "./js/storage.js", "./js/exercises.js", "./js/workout.js",
  "./js/rpe.js", "./js/state.js", "./js/stats.js", "./js/ui.js",
  "./icon-180.png", "./icon-512.png", "./manifest.json"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) {
          if (k !== CACHE) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first so updates show, falling back to cache when offline.
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) {
          c.put(e.request, copy);
        });
        return res;
      })
      .catch(function () {
        return caches.match(e.request).then(function (m) {
          return m || caches.match("./index.html");
        });
      })
  );
});
