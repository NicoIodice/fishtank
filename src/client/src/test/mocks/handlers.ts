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
];
