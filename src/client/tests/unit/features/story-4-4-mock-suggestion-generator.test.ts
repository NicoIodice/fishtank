import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  slugifyPath,
  generateFilename,
  generateMappingJson,
  generateMockSuggestion,
  prettyPrintJson,
} from "@/features/activity/utils/mockSuggestionGenerator";
import type { ActivityRow } from "@/features/activity/types";

/**
 * Unit tests — Story 4.4: Mock Suggestion Generator Utilities
 * Layer: Vitest (pure function testing)
 *
 * Coverage targets:
 * - slugifyPath: edge cases (empty path, special chars, long paths, leading slash)
 * - generateFilename: method casing, path combinations, status codes
 * - generateMappingJson: structure validation, useTransformer flag
 * - generateMockSuggestion: full integration of above functions
 * - prettyPrintJson: valid JSON, invalid JSON, null/empty input
 *
 * Coverage gates: 90%+ lines/statements/functions, 85%+ branches
 */

describe("Story 4.4: Mock Suggestion Generator Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── slugifyPath ─────────────────────────────────────────────────────────

  describe("slugifyPath", () => {
    it("removes leading slash", () => {
      expect(slugifyPath("/api/users")).toBe("api_users");
    });

    it("replaces slashes with underscores", () => {
      expect(slugifyPath("/api/v1/users/123")).toBe("api_v1_users_123");
    });

    it("removes non-alphanumeric characters except underscores", () => {
      expect(slugifyPath("/api/users?id=123&sort=desc")).toBe("api_usersid123sortdesc");
    });

    it("converts to lowercase", () => {
      expect(slugifyPath("/API/Users/123")).toBe("api_users_123");
    });

    it("truncates to 64 characters", () => {
      const longPath = "/api/" + "x".repeat(100);
      const result = slugifyPath(longPath);
      expect(result.length).toBe(64);
    });

    it("handles empty path", () => {
      expect(slugifyPath("")).toBe("");
    });

    it("handles path with only special characters", () => {
      expect(slugifyPath("/@#$%^&*()")).toBe("");
    });

    it("preserves underscores", () => {
      expect(slugifyPath("/api_v2/users_123")).toBe("api_v2_users_123");
    });

    it("handles path without leading slash", () => {
      expect(slugifyPath("api/users")).toBe("api_users");
    });

    it("handles path with multiple consecutive slashes", () => {
      expect(slugifyPath("/api//v1///users")).toBe("api__v1___users");
    });
  });

  // ─── generateFilename ───────────────────────────────────────────────────

  describe("generateFilename", () => {
    it("generates filename with lowercase method", () => {
      const result = generateFilename("GET", "/api/users", 200);
      expect(result).toBe("get_api_users_200");
    });

    it("handles POST method", () => {
      const result = generateFilename("POST", "/api/users", 201);
      expect(result).toBe("post_api_users_201");
    });

    it("handles PUT method", () => {
      const result = generateFilename("PUT", "/api/users/123", 200);
      expect(result).toBe("put_api_users_123_200");
    });

    it("handles DELETE method", () => {
      const result = generateFilename("DELETE", "/api/users/123", 204);
      expect(result).toBe("delete_api_users_123_204");
    });

    it("handles PATCH method", () => {
      const result = generateFilename("PATCH", "/api/users/123", 200);
      expect(result).toBe("patch_api_users_123_200");
    });

    it("handles error status codes", () => {
      const result = generateFilename("GET", "/api/users/999", 404);
      expect(result).toBe("get_api_users_999_404");
    });

    it("handles server error status codes", () => {
      const result = generateFilename("POST", "/api/users", 500);
      expect(result).toBe("post_api_users_500");
    });

    it("handles complex path with query params", () => {
      const result = generateFilename("GET", "/api/users?page=1&limit=10", 200);
      expect(result).toBe("get_api_userspage1limit10_200");
    });

    it("converts method to lowercase even if uppercase provided", () => {
      const result = generateFilename("GET", "/api/test", 200);
      expect(result.startsWith("get_")).toBe(true);
    });
  });

  // ─── generateMappingJson ─────────────────────────────────────────────────

  describe("generateMappingJson", () => {
    it("generates valid WireMock mapping structure", () => {
      const result = generateMappingJson(
        "GET",
        "/api/users",
        200,
        "get_api_users_200_body.json",
        true,
      );

      expect(result).toHaveProperty("Guid");
      expect(result).toHaveProperty("Request");
      expect(result).toHaveProperty("Response");
    });

    it("includes WildcardMatcher in Request.Path", () => {
      const result = generateMappingJson(
        "GET",
        "/api/users",
        200,
        "get_api_users_200_body.json",
      ) as any;

      expect(result.Request.Path.Matchers).toHaveLength(1);
      expect(result.Request.Path.Matchers[0].Name).toBe("WildcardMatcher");
      expect(result.Request.Path.Matchers[0].Pattern).toBe("/api/users");
    });

    it("includes uppercase HTTP method in Request.Methods", () => {
      const result = generateMappingJson(
        "get",
        "/api/users",
        200,
        "get_api_users_200_body.json",
      ) as any;

      expect(result.Request.Methods).toEqual(["GET"]);
    });

    it("converts lowercase method to uppercase", () => {
      const result = generateMappingJson(
        "post",
        "/api/users",
        201,
        "post_api_users_201_body.json",
      ) as any;

      expect(result.Request.Methods).toEqual(["POST"]);
    });

    it("includes StatusCode in Response", () => {
      const result = generateMappingJson(
        "GET",
        "/api/users",
        200,
        "get_api_users_200_body.json",
      ) as any;

      expect(result.Response.StatusCode).toBe(200);
    });

    it("includes BodyAsFile with relative path in Response", () => {
      const result = generateMappingJson(
        "GET",
        "/api/users",
        200,
        "get_api_users_200_body.json",
      ) as any;

      expect(result.Response.BodyAsFile).toBe("../responses/get_api_users_200_body.json");
    });

    it("sets UseTransformer to true by default", () => {
      const result = generateMappingJson(
        "GET",
        "/api/users",
        200,
        "get_api_users_200_body.json",
      ) as any;

      expect(result.Response.UseTransformer).toBe(true);
    });

    it("allows UseTransformer to be set to false", () => {
      const result = generateMappingJson(
        "GET",
        "/api/users",
        200,
        "get_api_users_200_body.json",
        false,
      ) as any;

      expect(result.Response.UseTransformer).toBe(false);
    });

    it("generates unique GUIDs for each call", () => {
      const result1 = generateMappingJson(
        "GET",
        "/api/users",
        200,
        "get_api_users_200_body.json",
      ) as any;
      const result2 = generateMappingJson(
        "GET",
        "/api/users",
        200,
        "get_api_users_200_body.json",
      ) as any;

      expect(result1.Guid).not.toBe(result2.Guid);
    });

    it("generates valid UUID format for Guid", () => {
      const result = generateMappingJson(
        "GET",
        "/api/users",
        200,
        "get_api_users_200_body.json",
      ) as any;

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(result.Guid).toMatch(uuidRegex);
    });

    it("handles error status codes", () => {
      const result = generateMappingJson(
        "GET",
        "/api/users/999",
        404,
        "get_api_users_999_404_body.json",
      ) as any;

      expect(result.Response.StatusCode).toBe(404);
    });

    it("handles server error status codes", () => {
      const result = generateMappingJson(
        "POST",
        "/api/users",
        500,
        "post_api_users_500_body.json",
      ) as any;

      expect(result.Response.StatusCode).toBe(500);
    });
  });

  // ─── generateMockSuggestion ─────────────────────────────────────────────

  describe("generateMockSuggestion", () => {
    const sampleRow: ActivityRow = {
      id: "test-row-1",
      timestamp: "2024-01-01T12:00:00Z",
      method: "POST",
      urlPath: "/api/users/123",
      statusCode: 201,
      type: "Proxied",
      serviceId: "service-1",
      serviceName: "Test Service",
      serviceSlug: "test-service",
      requestHeaders: '{"Content-Type": "application/json"}',
      requestBody: '{"name": "John"}',
      responseHeaders: '{"Content-Type": "application/json"}',
      responseBody: '{"id": 123, "name": "John"}',
      durationMs: 250,
    };

    it("generates complete suggestion with all fields", () => {
      const result = generateMockSuggestion(sampleRow);

      expect(result).toHaveProperty("mappingJson");
      expect(result).toHaveProperty("responseFilename");
      expect(result).toHaveProperty("mappingFilename");
    });

    it("generates mapping filename with correct format", () => {
      const result = generateMockSuggestion(sampleRow);

      expect(result.mappingFilename).toBe("post_api_users_123_201.json");
    });

    it("generates response filename with _body suffix", () => {
      const result = generateMockSuggestion(sampleRow);

      expect(result.responseFilename).toBe("post_api_users_123_201_body.json");
    });

    it("mapping JSON includes correct method", () => {
      const result = generateMockSuggestion(sampleRow);
      const mapping = result.mappingJson as any;

      expect(mapping.Request.Methods).toEqual(["POST"]);
    });

    it("mapping JSON includes correct path pattern", () => {
      const result = generateMockSuggestion(sampleRow);
      const mapping = result.mappingJson as any;

      expect(mapping.Request.Path.Matchers[0].Pattern).toBe("/api/users/123");
    });

    it("mapping JSON includes correct status code", () => {
      const result = generateMockSuggestion(sampleRow);
      const mapping = result.mappingJson as any;

      expect(mapping.Response.StatusCode).toBe(201);
    });

    it("mapping JSON references correct response file", () => {
      const result = generateMockSuggestion(sampleRow);
      const mapping = result.mappingJson as any;

      expect(mapping.Response.BodyAsFile).toBe("../responses/post_api_users_123_201_body.json");
    });

    it("sets UseTransformer to true by default", () => {
      const result = generateMockSuggestion(sampleRow);
      const mapping = result.mappingJson as any;

      expect(mapping.Response.UseTransformer).toBe(true);
    });

    it("handles GET requests", () => {
      const getRow: ActivityRow = { ...sampleRow, method: "GET", statusCode: 200 };
      const result = generateMockSuggestion(getRow);

      expect(result.mappingFilename).toBe("get_api_users_123_200.json");
      expect((result.mappingJson as any).Request.Methods).toEqual(["GET"]);
    });

    it("handles DELETE requests", () => {
      const deleteRow: ActivityRow = { ...sampleRow, method: "DELETE", statusCode: 204 };
      const result = generateMockSuggestion(deleteRow);

      expect(result.mappingFilename).toBe("delete_api_users_123_204.json");
      expect((result.mappingJson as any).Request.Methods).toEqual(["DELETE"]);
    });

    it("handles error responses", () => {
      const errorRow: ActivityRow = { ...sampleRow, statusCode: 500 };
      const result = generateMockSuggestion(errorRow);

      expect(result.mappingFilename).toBe("post_api_users_123_500.json");
      expect((result.mappingJson as any).Response.StatusCode).toBe(500);
    });

    it("handles 404 not found responses", () => {
      const notFoundRow: ActivityRow = { ...sampleRow, method: "GET", statusCode: 404 };
      const result = generateMockSuggestion(notFoundRow);

      expect(result.mappingFilename).toBe("get_api_users_123_404.json");
      expect((result.mappingJson as any).Response.StatusCode).toBe(404);
    });

    it("handles root path", () => {
      const rootRow: ActivityRow = { ...sampleRow, urlPath: "/" };
      const result = generateMockSuggestion(rootRow);

      // Root path slugifies to empty string after removing leading slash
      expect(result.mappingFilename).toBe("post__201.json");
    });

    it("handles path with query parameters", () => {
      const queryRow: ActivityRow = {
        ...sampleRow,
        urlPath: "/api/users?page=1&limit=10",
      };
      const result = generateMockSuggestion(queryRow);

      expect(result.mappingFilename).toBe("post_api_userspage1limit10_201.json");
    });
  });

  // ─── prettyPrintJson ────────────────────────────────────────────────────

  describe("prettyPrintJson", () => {
    it("pretty-prints valid JSON string", () => {
      const input = '{"name":"John","age":30}';
      const result = prettyPrintJson(input);

      expect(result).toContain("{\n");
      expect(result).toContain('  "name": "John"');
      expect(result).toContain('  "age": 30');
    });

    it("returns empty string for null input", () => {
      const result = prettyPrintJson(null);
      expect(result).toBe("");
    });

    it("returns empty string for empty string input", () => {
      const result = prettyPrintJson("");
      expect(result).toBe("");
    });

    it("returns original content for invalid JSON", () => {
      const input = "not valid json";
      const result = prettyPrintJson(input);
      expect(result).toBe("not valid json");
    });

    it("handles JSON with nested objects", () => {
      const input = '{"user":{"name":"John","address":{"city":"NYC"}}}';
      const result = prettyPrintJson(input);

      expect(result).toContain('"user"');
      expect(result).toContain('"address"');
      expect(result).toContain('"city"');
    });

    it("handles JSON arrays", () => {
      const input = '[{"id":1},{"id":2}]';
      const result = prettyPrintJson(input);

      expect(result).toContain("[\n");
      expect(result).toContain('"id": 1');
      expect(result).toContain('"id": 2');
    });

    it("preserves boolean values", () => {
      const input = '{"active":true,"deleted":false}';
      const result = prettyPrintJson(input);

      expect(result).toContain('"active": true');
      expect(result).toContain('"deleted": false');
    });

    it("preserves null values", () => {
      const input = '{"name":null}';
      const result = prettyPrintJson(input);

      expect(result).toContain('"name": null');
    });

    it("handles already pretty-printed JSON", () => {
      const input = '{\n  "name": "John"\n}';
      const result = prettyPrintJson(input);

      // Should still be valid and consistent formatting
      expect(result).toContain('"name"');
    });

    it("handles JSON with special characters", () => {
      const input = '{"message":"Hello\\nWorld\\t!"}';
      const result = prettyPrintJson(input);

      expect(result).toContain('"message"');
    });
  });
});
