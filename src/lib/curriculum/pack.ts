/**
 * Curriculum pack import/export helpers and install decision logic.
 */

import { contentHash } from "./hash.ts";
import { validateCurriculumPack, type ValidationFailure, type ValidationSuccess } from "./schema.ts";
import type { CurriculumPack, CurriculumPackContent, CurriculumPackMeta, InstalledPackRecord } from "./types.ts";

export type InstallDecision =
  | { action: "install"; reason: string }
  | { action: "replace"; reason: string; existing: InstalledPackRecord }
  | { action: "skip"; reason: string; existing: InstalledPackRecord }
  | { action: "reject"; reason: string };

/**
 * Build a pack from validated content + metadata fields.
 * Computes the content hash from the content only (meta.contentHash is set).
 */
export async function buildPack(
  content: CurriculumPackContent,
  options: {
    packId: string;
    title: string;
    description: string;
    streamCode: string | null;
    isDevelopmentFixture: boolean;
    createdAt?: string;
  },
): Promise<CurriculumPack> {
  const hash = await contentHash(content);
  const meta: CurriculumPackMeta = {
    packId: options.packId,
    systemId: content.system.id,
    versionId: content.version.id,
    gradeCode: content.grade.code,
    streamCode: options.streamCode,
    title: options.title,
    description: options.description,
    contentHash: hash,
    createdAt: options.createdAt ?? new Date().toISOString(),
    isDevelopmentFixture: options.isDevelopmentFixture,
  };
  return { meta, content };
}

/**
 * Validate an unknown payload and optionally verify the declared content hash.
 */
export async function importPack(
  raw: unknown,
  options: { verifyHash?: boolean } = {},
): Promise<ValidationSuccess | ValidationFailure> {
  const result = validateCurriculumPack(raw);
  if (!result.ok) return result;

  if (options.verifyHash !== false) {
    const computed = await contentHash(result.pack.content);
    if (computed !== result.pack.meta.contentHash) {
      return {
        ok: false,
        message: "Content hash mismatch. Pack may be corrupted or altered.",
        issues: [`expected ${result.pack.meta.contentHash}, got ${computed}`],
      };
    }
  }

  return result;
}

/**
 * Decide how to handle installing a validated pack given what is already installed.
 * Same packId + same contentHash → skip.
 * Same packId + different hash → replace (new version of the pack).
 * Different packId → install.
 */
export function decideInstall(
  pack: CurriculumPack,
  existing: InstalledPackRecord | undefined,
): InstallDecision {
  if (!existing) {
    return { action: "install", reason: "New pack." };
  }
  if (existing.meta.contentHash === pack.meta.contentHash) {
    return {
      action: "skip",
      reason: "Identical content already installed.",
      existing,
    };
  }

  const existingStatus = existing.content.version.status;
  const sameVersionId = existing.meta.versionId === pack.meta.versionId;

  // Active and retired curriculum versions are immutable.
  if (sameVersionId && (existingStatus === "active" || existingStatus === "retired")) {
    return {
      action: "reject",
      reason: `Curriculum version is ${existingStatus} and immutable. Ship a new version id for corrections.`,
    };
  }

  return {
    action: "replace",
    reason: "Same pack id with different content hash; treating as updated version.",
    existing,
  };
}

/** Serialize a pack for export / download. */
export function exportPackJson(pack: CurriculumPack): string {
  return JSON.stringify(pack, null, 2);
}
