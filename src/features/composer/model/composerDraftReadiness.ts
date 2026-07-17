import type { ComposerRequestDraft } from '../../../domain/generationTask';
import type { StudioSettings } from '../../../domain/studioSettings';
import {
  analyzeComposerDraft,
  type ComposerDraftIssue as AnalysisComposerDraftIssue
} from '../../../processes/generation-request/analyzeComposerDraft';

export type ComposerDraftIssue = AnalysisComposerDraftIssue | null;

export interface ComposerDraftReadiness {
  draftId: string;
  ready: boolean;
  issue: ComposerDraftIssue;
  attachmentCount: number;
  expectedImageCount: number;
}

export interface ComposerQueueSummary {
  totalCount: number;
  readyCount: number;
  invalidCount: number;
  totalExpectedImages: number;
}

export function evaluateComposerDraftReadiness(
  draft: ComposerRequestDraft,
  settings: StudioSettings
): ComposerDraftReadiness {
  const analysis = analyzeComposerDraft(draft, settings);
  return {
    draftId: analysis.draftId,
    ready: analysis.ready,
    issue: analysis.issue,
    attachmentCount: analysis.attachmentCount,
    expectedImageCount: analysis.expectedImageCount
  };
}

export function summarizeComposerQueue(readiness: ComposerDraftReadiness[]): ComposerQueueSummary {
  let readyCount = 0;
  let totalExpectedImages = 0;
  for (const item of readiness) {
    if (item.ready) readyCount += 1;
    totalExpectedImages += item.expectedImageCount;
  }
  return {
    totalCount: readiness.length,
    readyCount,
    invalidCount: readiness.length - readyCount,
    totalExpectedImages
  };
}
