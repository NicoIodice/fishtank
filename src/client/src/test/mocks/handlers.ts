import { http, HttpResponse } from "msw";

export const handlers = [
  // GET /api/activity — Story 3.2
  http.get("/api/activity", () => {
    return HttpResponse.json({
      success: true,
      data: [],
    });
  }),

  // DELETE /api/activity — Story 3.3 (clear log)
  http.delete("/api/activity", () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // PUT /api/settings/capture-headers — Story 2.5 / Story 3.3
  http.put("/api/settings/capture-headers", () => {
    return HttpResponse.json({
      success: true,
      data: { captureFullHeaders: true },
    });
  }),

  // ─── Story 4.2: Mappings endpoints ─────────────────────────────────────────
  // GET /api/mappings — returns folder tree (default empty tree for unit tests)
  http.get("/api/mappings", () => {
    return HttpResponse.json({
      success: true,
      data: {
        mocksRoot: "/var/mocks",
        children: [],
      },
    });
  }),

  // GET /api/mappings/{**path} — returns single file content (Story 4.2, Task 2)
  // Individual tests override this handler via server.use() with richer fixtures.
  http.get("/api/mappings/:path", () => {
    return HttpResponse.json({
      success: false,
      error: { code: "MAPPING_FILE_NOT_FOUND", message: "File not found" },
    }, { status: 404 });
  }),

  // POST /api/mappings — create mapping file
  http.post("/api/mappings", () => {
    return HttpResponse.json({
      success: true,
      data: {
        name: "new-file.json",
        path: "service/mappings/new-file.json",
        lastModified: new Date().toISOString(),
        sizeBytes: 42,
      },
    }, { status: 201 });
  }),

  // PUT /api/mappings/{**path} — update mapping file
  http.put("/api/mappings/:path", () => {
    return HttpResponse.json({
      success: true,
      data: {
        name: "updated-file.json",
        path: "service/mappings/updated-file.json",
        lastModified: new Date().toISOString(),
        sizeBytes: 42,
      },
    });
  }),

  // DELETE /api/mappings/{**path} — delete mapping file
  http.delete("/api/mappings/:path", () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // ─── Story 4.3: Resync endpoint ────────────────────────────────────────────
  // POST /api/resync — default handler returns empty success; individual tests
  // override via server.use() with richer fixtures.
  http.post("/api/resync", () => {
    return HttpResponse.json({
      success: true,
      data: {
        mappingsLoaded: 0,
        responsesLoaded: 0,
        elapsedMs: 42,
        conflicts: [],
        failures: [],
      },
    });
  }),
];
