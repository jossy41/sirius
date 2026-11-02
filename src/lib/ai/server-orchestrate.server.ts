import { offlineHeuristicProvider } from "./offline-provider.ts";
import { mockProvider } from "./mock-provider.ts";
import { createLiveProvider, readServerAiConfig } from "./live-provider.server.ts";
import { verifyConsentToken } from "./consent-token.server.ts";
import type { AiGenerateRequest, AiGenerateResponse } from "./types.ts";
import type { ValidatedTutorBody } from "./request-schema.ts";

export async function runServerTutorTurn(body: ValidatedTutorBody): Promise<AiGenerateResponse> {
  const req: AiGenerateRequest = {
    mode: body.mode,
    userMessage: body.userMessage,
    language: body.language,
    topicLabel: body.topicLabel,
    objectiveId: body.objectiveId,
    objectiveStatement: body.objectiveStatement,
    misconceptionTitle: body.misconceptionTitle,
    misconceptionDescription: body.misconceptionDescription,
    sourceChunks: body.sourceChunks,
    history: body.history,
    allowGeneralExplanation: true,
  };

  if (body.prefer === "offline") return offlineHeuristicProvider.generate(req);
  if (body.prefer === "mock") return mockProvider.generate(req);

  if (body.prefer === "live" || body.prefer === "auto") {
    // Authorization: verified token only — never body.externalConsentClaim alone
    const auth = verifyConsentToken(body.consentToken);
    if (!auth.ok) {
      return offlineHeuristicProvider.generate(req);
    }
    if (!readServerAiConfig().configured) {
      return offlineHeuristicProvider.generate(req);
    }
    const res = await createLiveProvider().generate(req);
    if (res.provider === "live") return res;
    const offline = await offlineHeuristicProvider.generate(req);
    return {
      ...offline,
      content: `Live AI was unavailable (${res.error ?? "error"}). Showing offline help instead:\n\n${offline.content}`,
      provider: "offline_heuristic",
      error: res.error,
    };
  }

  return offlineHeuristicProvider.generate(req);
}
