import { describe, expect, it } from "vitest";
import { normalizeHookSecret } from "./route";

describe("normalizeHookSecret", () => {
  it("strips the leading v1, version marker Supabase adds", () => {
    expect(normalizeHookSecret("v1,whsec_abc123")).toBe("whsec_abc123");
  });

  it("leaves a bare whsec_ secret unchanged", () => {
    // standardwebhooks already strips this prefix itself — the
    // version marker is the only thing this function needs to handle.
    expect(normalizeHookSecret("whsec_abc123")).toBe("whsec_abc123");
  });

  it("only strips a leading v1,, not one appearing elsewhere", () => {
    expect(normalizeHookSecret("whsec_v1,abc123")).toBe("whsec_v1,abc123");
  });

  it("passes through an empty secret unchanged", () => {
    expect(normalizeHookSecret("")).toBe("");
  });
});
