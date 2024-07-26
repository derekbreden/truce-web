// On push show notifications and tell client to refresh
self.addEventListener("push", (event) => {
  const payload = event.data?.text();
  if (payload) {
    let parsed_payload = {};
    try {
      parsed_payload = JSON.parse(payload);
    } catch (e) {}
    const title = parsed_payload.title || "Truce";
    const body = parsed_payload.body || "You have a new reply";
    const tag = parsed_payload.tag || "no-tag-in-payload";
    const unread_count = parsed_payload.unread_count || 0;

    // Asynchronous events
    const promises = [];

    // Show the notification
    promises.push(
      self.registration.showNotification(title, {
        body,
        tag,
      })
    );

    // Tell the client to refresh
    promises.push(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            push_update: true,
          });
        });
      })
    );
    event.waitUntil(Promise.all(promises));
    
    if (navigator.setAppBadge && unread_count) {
      navigator.setAppBadge(unread_count);
    }
  }
});

// Network first cache
const cache_name = "truce";
const networkFirst = async (request) => {
  const cloned_request = request.clone();
  try {
    const network_response = await fetch(request);
    if (network_response.ok) {
      const cache = await caches.open(cache_name);
      if (request.url.match(/session/)) {
        const body = await cloned_request.text();
        cache.put(cloned_request.url + body, network_response.clone());
      } else {
        cache.put(cloned_request, network_response.clone());
      }
    }
    return network_response;
  } catch ($error) {
    const cache = await caches.open(cache_name);
    let lookup_by = cloned_request;
    if (cloned_request.url.match(/session/)) {
      const body = await cloned_request.text();
      lookup_by = cloned_request.url + body;
    }
    const cached_response = await cache.match(lookup_by);
    return cached_response || Response.error();
  }
};
self.addEventListener("fetch", ($event) => {
  $event.respondWith(networkFirst($event.request));
});