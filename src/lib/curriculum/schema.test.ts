import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectPrerequisiteCycles } from "./graph.ts";
import { contentHash, stableStringify } from "./hash.ts";
import { validateCurriculumPack } from "./schema.ts";
import { buildPack, decideInstall, importPack } from "./pack.ts";
import { getDevelopmentFixturePacks } from "./fixtures.ts";
import type { CurriculumPack, InstalledPackRecord } from "./types.ts";

describe("stableStringify and contentHash", () => {
  it("produces identical hashes for key-order-independent objects", async () => {
    const a = { b: 1, a: 2 };
    const b = { a: 2, b: 1 };
    assert.equal(stableStringify(a), stableStringify(b));
    assert.equal(await contentHash(a), await contentHash(b));
  });
});

describe("detectPrerequisiteCycles", () => {
  it("accepts an acyclic graph", () => {
    const result = detectPrerequisiteCycles([
      { objectiveId: "b", requiresObjectiveId: "a", kind: "required" },
      { objectiveId: "c", requiresObjectiveId: "b", kind: "required" },
    ]);
    assert.equal(result.ok, true);
  });

  it("rejects a cycle", () => {
    const result = detectPrerequisiteCycles([
      { objectiveId: "b", requiresObjectiveId: "a", kind: "required" },
      { objectiveId: "a", requiresObjectiveId: "b", kind: "required" },
    ]);
    assert.equal(result.ok, false);
  });
});

describe("validateCurriculumPack", () => {
  it("accepts development fixtures", async () => {
    const packs = await getDevelopmentFixturePacks();
    for (const pack of packs) {
      const result = validateCurriculumPack(pack);
      assert.equal(result.ok, true, result.ok ? "" : result.message + " " + (result.issues ?? []).join("; "));
    }
  });

  it("rejects missing subject reference", async () => {
    const packs = await getDevelopmentFixturePacks();
    const pack = structuredClone(packs[0]);
    pack.content.topics[0].subjectId = "missing-subject";
    const result = validateCurriculumPack(pack);
    assert.equal(result.ok, false);
  });

  it("rejects blueprint weights that do not sum to 1", async () => {
    const packs = await getDevelopmentFixturePacks();
    const pack = structuredClone(packs.find((p) => p.content.blueprints.length > 0)!);
    pack.content.blueprintWeights[0].weight = 0.5;
    const result = validateCurriculumPack(pack);
    assert.equal(result.ok, false);
  });

  it("rejects duplicate objective ids", async () => {
    const packs = await getDevelopmentFixturePacks();
    const pack = structuredClone(packs[0]);
    pack.content.objectives.push({ ...pack.content.objectives[0] });
    const result = validateCurriculumPack(pack);
    assert.equal(result.ok, false);
  });
});

describe("importPack and decideInstall", () => {
  it("verifies content hash", async () => {
    const packs = await getDevelopmentFixturePacks();
    const pack = structuredClone(packs[0]);
    pack.meta.contentHash = "deadbeef";
    const result = await importPack(pack, { verifyHash: true });
    assert.equal(result.ok, false);
  });

  it("skips identical install", async () => {
    const packs = await getDevelopmentFixturePacks();
    const pack = packs[0];
    const existing: InstalledPackRecord = {
      packId: pack.meta.packId,
      meta: pack.meta,
      content: pack.content,
      installedAt: new Date().toISOString(),
    };
    const decision = decideInstall(pack, existing);
    assert.equal(decision.action, "skip");
  });

  it("replaces when hash differs", async () => {
    const packs = await getDevelopmentFixturePacks();
    const pack = packs[0];
    const existing: InstalledPackRecord = {
      packId: pack.meta.packId,
      meta: { ...pack.meta, contentHash: "different" },
      content: pack.content,
      installedAt: new Date().toISOString(),
    };
    const decision = decideInstall(pack, existing);
    assert.equal(decision.action, "replace");
  });
});

describe("buildPack", () => {
  it("sets a content hash", async () => {
    const packs = await getDevelopmentFixturePacks();
    const rebuilt = await buildPack(packs[0].content, {
      packId: "test-rebuild",
      title: "Rebuild",
      description: "",
      streamCode: null,
      isDevelopmentFixture: true,
    });
    assert.equal(rebuilt.meta.contentHash, packs[0].meta.contentHash);
  });
});

describe("stream-grade validation", () => {
  it("rejects meta.streamCode that does not apply to pack grade", async () => {
    const packs = await getDevelopmentFixturePacks();
    const pack = structuredClone(packs.find((p) => p.meta.gradeCode === "9") ?? packs[0]);
    pack.meta.streamCode = "natural";
    pack.content.streams = [
      {
        id: "ET-NAT",
        versionId: pack.content.version.id,
        code: "natural",
        label: "Natural Sciences",
        gradeCodes: ["11", "12"],
      },
    ];
    const result = validateCurriculumPack(pack);
    assert.equal(result.ok, false);
    assert.ok(result.ok === false && result.issues?.some((i) => i.includes("does not apply to pack grade")));
  });

  it("rejects subject stream that does not apply to pack grade", async () => {
    const packs = await getDevelopmentFixturePacks();
    const pack = structuredClone(packs.find((p) => p.meta.gradeCode === "9") ?? packs[0]);
    pack.content.streams = [
      {
        id: "ET-NAT",
        versionId: pack.content.version.id,
        code: "natural",
        label: "Natural Sciences",
        gradeCodes: ["11", "12"],
      },
    ];
    if (pack.content.subjects[0]) {
      pack.content.subjects[0].streamCodes = ["natural"];
    }
    const result = validateCurriculumPack(pack);
    assert.equal(result.ok, false);
    assert.ok(result.ok === false && result.issues?.some((i) => i.includes("does not apply to pack grade")));
  });
});

describe("blueprint weight validation", () => {
  it("rejects blueprint with no weights", async () => {
    const packs = await getDevelopmentFixturePacks();
    const pack = structuredClone(packs[0]);
    const subjectId = pack.content.subjects[0]?.id;
    if (!subjectId) return;
    pack.content.blueprints = [
      {
        id: "bp-empty",
        versionId: pack.content.version.id,
        name: "Empty weights blueprint",
        gradeCode: pack.content.grade.code,
        streamCode: pack.meta.streamCode,
        subjectId,
      },
    ];
    pack.content.blueprintWeights = [];
    const result = validateCurriculumPack(pack);
    assert.equal(result.ok, false);
    assert.ok(result.ok === false && result.issues?.some((i) => i.includes("has no weights")));
  });
});

describe("curriculum version immutability", () => {
  it("rejects replace of active version with different content under same version id", async () => {
    const packs = await getDevelopmentFixturePacks();
    const pack = structuredClone(packs[0]);
    pack.content.version.status = "active";
    const existing: InstalledPackRecord = {
      packId: pack.meta.packId,
      meta: { ...pack.meta, contentHash: "old-hash" },
      content: pack.content,
      installedAt: new Date().toISOString(),
    };
    const incoming = structuredClone(pack);
    incoming.meta.contentHash = "new-hash";
    const decision = decideInstall(incoming, existing);
    assert.equal(decision.action, "reject");
  });

  it("rejects replace of retired version with different content under same version id", async () => {
    const packs = await getDevelopmentFixturePacks();
    const pack = structuredClone(packs[0]);
    pack.content.version.status = "retired";
    const existing: InstalledPackRecord = {
      packId: pack.meta.packId,
      meta: { ...pack.meta, contentHash: "old-hash" },
      content: pack.content,
      installedAt: new Date().toISOString(),
    };
    const incoming = structuredClone(pack);
    incoming.meta.contentHash = "new-hash";
    const decision = decideInstall(incoming, existing);
    assert.equal(decision.action, "reject");
  });

  it("allows replace of draft version with different content", async () => {
    const packs = await getDevelopmentFixturePacks();
    const pack = structuredClone(packs[0]);
    pack.content.version.status = "draft";
    const existing: InstalledPackRecord = {
      packId: pack.meta.packId,
      meta: { ...pack.meta, contentHash: "old-hash" },
      content: pack.content,
      installedAt: new Date().toISOString(),
    };
    const incoming = structuredClone(pack);
    incoming.meta.contentHash = "new-hash";
    const decision = decideInstall(incoming, existing);
    assert.equal(decision.action, "replace");
  });
});
