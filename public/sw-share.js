self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === "/share" && event.request.method === "POST") {
    event.respondWith(handleSharedImage(event.request));
  }
});

async function handleSharedImage(request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (file && file.type && file.type.startsWith("image/")) {
    const buf = await file.arrayBuffer();
    const data = Array.from(new Uint8Array(buf));
    const clients = await self.clients.matchAll();
    clients.forEach((c) => c.postMessage({ type: "shared-image", name: file.name, fileType: file.type, data }));
  }
  return Response.redirect("/", 303);
}

