import { http, HttpResponse } from "msw";

export const handlers = [
  // GET /api/activity — Story 3.2
  http.get("/api/activity", () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: [],
        total: 0,
      },
    });
  }),
];
