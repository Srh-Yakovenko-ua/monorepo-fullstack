import { describe, expect, it } from "vitest";

import { escapeRegExp } from "./regex.js";

describe("escapeRegExp", () => {
  it("escapes wildcard star", () => {
    expect(escapeRegExp("*")).toBe("\\*");
  });

  it("escapes character class brackets and dash", () => {
    expect(escapeRegExp("[a-z]")).toBe("\\[a-z\\]");
  });

  it("escapes all regex metacharacters together", () => {
    expect(escapeRegExp(".+?^${}()|[]\\")).toBe("\\.\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });

  it("leaves plain alphanumeric unchanged", () => {
    expect(escapeRegExp("hello world 123")).toBe("hello world 123");
  });

  it("returns empty string for empty input", () => {
    expect(escapeRegExp("")).toBe("");
  });
});
