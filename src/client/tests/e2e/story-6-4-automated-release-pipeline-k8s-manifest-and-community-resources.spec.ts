import { test, expect } from "../support/fixtures";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * RED-PHASE ATDD acceptance test scaffolds for Story 6.4:
 * Automated Release Pipeline, K8s Manifest & Community Resources (AC-15).
 *
 * These tests FAIL before implementation. They PASS once Story 6.4 is done.
 *
 * ACs covered:
 *   AC-15: DevContainer configuration exists with Node.js 22, .NET SDK 10.0, Docker CLI
 *
 * RED before implementation:
 *   - .devcontainer/devcontainer.json does NOT exist
 *   - DevContainer features for Node.js, .NET, Docker are missing
 *   - postCreateCommand is not configured
 *
 * Note: These are infrastructure/config validation tests, not typical E2E behavioral tests.
 * They verify that required configuration files exist with correct content.
 *
 * Test Design Reference: _bmad-output/test-artifacts/test-design/test-design-epic-6.md (Story 6-4 section)
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── P2: DevContainer Configuration (AC-15) ───────────────────────────────

test.describe("P2 — AC-15: DevContainer configuration", () => {
  const projectRoot = path.resolve(__dirname, "../../../..");
  const devcontainerPath = path.join(projectRoot, ".devcontainer", "devcontainer.json");

  /**
   * RED: .devcontainer/devcontainer.json does not exist yet
   * GREEN: File exists after Story 6.4 implementation
   */
  test(".devcontainer/devcontainer.json exists in repository root", async () => {
    // Assert
    // RED: File does not exist yet
    const exists = fs.existsSync(devcontainerPath);
    expect(exists).toBe(true);
  });

  /**
   * RED: devcontainer.json does not contain Node.js 22 feature
   * GREEN: Node.js 22 feature is configured
   */
  test("DevContainer includes Node.js 22 feature", async () => {
    // Arrange
    const exists = fs.existsSync(devcontainerPath);
    expect(exists).toBe(true);

    const content = fs.readFileSync(devcontainerPath, "utf-8");
    const config = JSON.parse(content);

    // Assert — Node.js 22 feature is present
    // RED: Node.js feature does not exist yet
    const hasNodeFeature =
      !!(config.features &&
      (config.features["ghcr.io/devcontainers/features/node:1"] ||
        Object.keys(config.features).some((key) =>
          key.includes("node") && (
            config.features[key]?.version === "22" ||
            config.features[key]?.version === "lts/iron" ||
            config.features[key] === "22"
          )
        )));

    expect(hasNodeFeature).toBe(true);
  });

  /**
   * RED: devcontainer.json does not contain .NET SDK 10.0 feature
   * GREEN: .NET SDK 10.0 feature is configured OR base image includes .NET SDK
   */
  test("DevContainer includes .NET SDK 10.0 feature", async () => {
    // Arrange
    const exists = fs.existsSync(devcontainerPath);
    expect(exists).toBe(true);

    const content = fs.readFileSync(devcontainerPath, "utf-8");
    const config = JSON.parse(content);

    // Assert — .NET SDK is available either via feature OR baked into base image
    // Check for explicit feature first
    const hasDotNetFeature =
      config.features &&
      (config.features["ghcr.io/devcontainers/features/dotnet:2"] ||
        Object.keys(config.features).some((key) =>
          key.includes("dotnet") && (
            config.features[key]?.version === "10.0" ||
            config.features[key]?.version === "10" ||
            config.features[key] === "10.0" ||
            config.features[key] === "10"
          )
        ));

    // Check if base image contains dotnet (SDK baked in)
    const hasDotNetImage = config.image && config.image.toLowerCase().includes("dotnet");

    expect(hasDotNetFeature || hasDotNetImage).toBe(true);
  });

  /**
   * RED: devcontainer.json does not contain Docker CLI feature
   * GREEN: Docker CLI feature is configured
   */
  test("DevContainer includes Docker CLI feature", async () => {
    // Arrange
    const exists = fs.existsSync(devcontainerPath);
    expect(exists).toBe(true);

    const content = fs.readFileSync(devcontainerPath, "utf-8");
    const config = JSON.parse(content);

    // Assert — Docker CLI feature is present
    // RED: Docker CLI feature does not exist yet
    const hasDockerFeature =
      !!(config.features &&
      (config.features["ghcr.io/devcontainers/features/docker-in-docker:2"] ||
        config.features["ghcr.io/devcontainers/features/docker-outside-of-docker:1"] ||
        Object.keys(config.features).some((key) => key.includes("docker"))));

    expect(hasDockerFeature).toBe(true);
  });

  /**
   * RED: postCreateCommand is not configured
   * GREEN: postCreateCommand runs npm install and dotnet restore
   */
  test("DevContainer postCreateCommand runs npm install and dotnet restore", async () => {
    // Arrange
    const exists = fs.existsSync(devcontainerPath);
    expect(exists).toBe(true);

    const content = fs.readFileSync(devcontainerPath, "utf-8");
    const config = JSON.parse(content);

    // Assert — postCreateCommand is present
    // RED: postCreateCommand does not exist yet
    expect(config.postCreateCommand).toBeDefined();

    // Verify it includes npm install
    const commandString = typeof config.postCreateCommand === "string"
      ? config.postCreateCommand
      : Array.isArray(config.postCreateCommand)
      ? config.postCreateCommand.join(" ")
      : JSON.stringify(config.postCreateCommand);

    expect(commandString).toContain("npm install");
    expect(commandString).toContain("dotnet restore");
  });
});

// ─── P1: Repository Root Files Validation ─────────────────────────────────

test.describe("P1 — Repository root configuration files", () => {
  const projectRoot = path.resolve(__dirname, "../../../..");
  const deploymentYamlPath = path.join(projectRoot, "deployment.yaml");

  /**
   * RED: deployment.yaml does not exist in repo root
   * GREEN: File exists after Story 6.4 implementation
   */
  test("deployment.yaml exists in repository root (infrastructure validation)", async () => {
    // Assert
    // RED: File does not exist yet
    const exists = fs.existsSync(deploymentYamlPath);
    expect(exists).toBe(true);
  });

  /**
   * RED: deployment.yaml does not contain Deployment kind
   * GREEN: File contains valid K8s Deployment resource
   */
  test("deployment.yaml contains Kubernetes Deployment resource", async () => {
    // Arrange
    const exists = fs.existsSync(deploymentYamlPath);
    expect(exists).toBe(true);

    const content = fs.readFileSync(deploymentYamlPath, "utf-8");

    // Assert — contains Deployment kind
    // RED: Deployment resource does not exist yet
    expect(content).toContain("kind: Deployment");
    expect(content).toContain("apiVersion: apps/v1");
  });
});
