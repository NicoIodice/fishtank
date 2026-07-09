// DTO mirrors for the Mappings API (Story 4.2)
// Matches backend DTOs: FolderTreeDto, TreeNodeDto, FileMetadataDto, FileContentDto

export interface TreeNode {
  name: string;
  type: "folder" | "file";
  path: string;
  lastModified: string | null;
  sizeBytes: number | null;
  children: TreeNode[] | null;
}

export interface FolderTree {
  mocksRoot: string;
  children: TreeNode[];
}

export interface FileContent {
  content: string;
  name: string;
  path: string;
  lastModified: string;
  sizeBytes: number;
}

export interface FileMetadata {
  name: string;
  path: string;
  lastModified: string;
  sizeBytes: number;
}

/** Parsed JSON object representing the mapping file content in the edit buffer. */
export type MappingJson = Record<string, unknown>;

// ─── Story 4.3: Resync DTOs ──────────────────────────────────────────────────

export interface ConflictDto {
  path: string;
  reason: string;
}

export interface ResyncFailureDto {
  path: string;
  reason: string;
}

export interface ResyncResultDto {
  mappingsLoaded: number;
  responsesLoaded: number;
  elapsedMs: number;
  conflicts: ConflictDto[];
  failures: ResyncFailureDto[];
}
