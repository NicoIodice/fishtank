import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./mocks/server";

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));

// Reset any request handlers that are declared as a part of a test
afterEach(() => server.resetHandlers());

// Clean up after all tests are complete
afterAll(() => server.close());
