// Keeps 1up working with no signal. The app page is fetched fresh when online (so updates arrive) and kept when it
// loads. The kept copy opens when there's no signal, or when the network hasn't answered within NETWORK_WAIT_MS
// (one bar on the course); a late answer is still kept for next time. Only the app page is kept that way: another
// page here (the privacy policy the About card links to) or an error page never takes its place. Weather requests
// go straight to the network.
const CACHE = '1up-00ba86d8178d';
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "barlow-condensed-latin-500-normal.woff2", "barlow-condensed-latin-600-normal.woff2", "public-sans-latin-400-normal.woff2", "public-sans-latin-500-normal.woff2", "public-sans-latin-600-normal.woff2", "public-sans-latin-700-normal.woff2"];
const NETWORK_WAIT_MS = 3000;
// The app page's addresses: this folder, and index.html in it.
const APP_PAGES = [new URL('./', location).pathname, new URL('index.html', location).pathname];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// The app page from the network when it answers in time; otherwise the kept copy (or the network's answer, when
// nothing is kept yet). A good answer is kept whenever it comes, even after the kept copy was shown.
function freshApp(e) {
  const net = fetch(e.request);
  // Copied as soon as it arrives, before the page reads it.
  const copy = net.then((res) => (res.ok ? res.clone() : null));
  e.waitUntil(copy.then((res) => res && caches.open(CACHE).then((c) => c.put('index.html', res))));
  const kept = pause(NETWORK_WAIT_MS).then(() => caches.match('index.html')).then((hit) => hit || net);
  return Promise.race([net, kept]).catch(() => caches.match('index.html'));
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate' && APP_PAGES.includes(url.pathname)) {
    e.respondWith(freshApp(e));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
