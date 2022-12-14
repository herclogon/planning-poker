const staticCache = "planning-poker-v1";
const assets = [
];

self.addEventListener("install", (installEvent) => {
  //   console.log("installEvent", installEvent);
  installEvent.waitUntil(
    caches.open(staticCache).then((cache) => {
      cache.addAll(assets);
    })
  );
});

self.addEventListener("fetch", (fetchEvent) => {
  //   console.log("fetchEvent", fetchEvent);
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then((res) => {
      return fetch(fetchEvent.request);
    })
  );
});
