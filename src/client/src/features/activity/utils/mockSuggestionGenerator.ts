import type { ActivityRow } from "../types";

export interface WireMockMatcher {
  Name: string;
  Pattern: string;
}

export interface WireMockMapping {
  Guid: string;
  Request: {
    Path: { Matchers: WireMockMatcher[] };
    Methods: string[];
  };
  Response: {
    StatusCode: number;
    BodyAsFile: string;
    UseTransformer: boolean;
  };
}

/**
 * Slugify a URL path for use in filenames.
 * Removes leading slash, replaces slashes with underscores, removes non-alphanumeric
 * characters (except underscores), and truncates to 64 chars.
 */
export function slugifyPath(urlPath: string): string {
  return urlPath
    .toLowerCase()
    .replace(/^\//, "") // remove leading slash
    .replace(/\//g, "_") // replace slashes with underscores
    .replace(/[^a-z0-9_]/g, "") // remove non-alphanumeric except underscore
    .substring(0, 64); // truncate to 64 chars
}

/**
 * Generate the base filename (without extension) for mapping and response files.
 * Format: {method}_{path-slugified}_{status}
 */
export function generateFilename(
  method: string,
  urlPath: string,
  status: number,
): string {
  const slugged = slugifyPath(urlPath);
  return `${method.toLowerCase()}_${slugged}_${status}`;
}

/**
 * Generate the default WireMock mapping JSON structure.
 * Returns a JSON object with:
 * - Guid: newly generated UUID
 * - Request: Path matchers (WildcardMatcher) and Methods
 * - Response: StatusCode, BodyAsFile reference, UseTransformer flag
 */
export function generateMappingJson(
  method: string,
  urlPath: string,
  statusCode: number,
  responseFilename: string,
  useTransformer = true,
): WireMockMapping {
  return {
    Guid: crypto.randomUUID(),
    Request: {
      Path: {
        Matchers: [
          {
            Name: "WildcardMatcher",
            Pattern: urlPath,
          },
        ],
      },
      Methods: [method.toUpperCase()],
    },
    Response: {
      StatusCode: statusCode,
      BodyAsFile: `../responses/${responseFilename}`,
      UseTransformer: useTransformer,
    },
  };
}

/**
 * Generate the full mapping structure and response filename from an ActivityRow.
 * Returns an object with:
 * - mappingJson: the mapping object (ready to be JSON.stringify'ed)
 * - responseFilename: the response body filename
 * - mappingFilename: the mapping filename
 */
export function generateMockSuggestion(row: ActivityRow) {
  const baseFilename = generateFilename(
    row.method,
    row.urlPath,
    row.statusCode,
  );
  const mappingFilename = `${baseFilename}.json`;
  const responseFilename = `${baseFilename}_body.json`;

  const mappingJson = generateMappingJson(
    row.method,
    row.urlPath,
    row.statusCode,
    responseFilename,
    true, // UseTransformer default = true
  );

  return {
    mappingJson,
    responseFilename,
    mappingFilename,
  };
}

/**
 * Pretty-print JSON content for display in textareas.
 */
export function prettyPrintJson(content: string | null): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // If not valid JSON, return as-is
    return content;
  }
}
