import type { ComposerCommandDeps } from './appCommandTypes';
import { getComposerModeForAttachmentRole, setComposerDraftWithCompatibility } from './providerCompatibilityCommands';

export function setComposerTargetImage(args: ComposerCommandDeps, file: File | null): void {
  setComposerDraftWithCompatibility(args, {
    providerModeId: file ? getComposerModeForAttachmentRole(args, 'targetImage') : args.providerModeId,
    targetImage: file,
    referenceImages: args.referenceImages,
    mask: args.mask
  });
}

export function setComposerReferenceImages(args: ComposerCommandDeps, files: File[]): void {
  setComposerDraftWithCompatibility(args, {
    providerModeId: files.length > 0 ? getComposerModeForAttachmentRole(args, 'referenceImage') : args.providerModeId,
    targetImage: args.targetImage,
    referenceImages: files,
    mask: args.mask
  });
}

export function setComposerImageAttachments(args: ComposerCommandDeps, targetImage: File | null, referenceImages: File[]): void {
  const providerModeId = targetImage
    ? getComposerModeForAttachmentRole(args, 'targetImage')
    : referenceImages.length > 0
      ? getComposerModeForAttachmentRole(args, 'referenceImage')
      : args.providerModeId;
  setComposerDraftWithCompatibility(args, {
    providerModeId,
    targetImage,
    referenceImages,
    mask: args.mask
  });
}

export function setComposerMask(args: ComposerCommandDeps, file: File | null): void {
  setComposerDraftWithCompatibility(args, {
    providerModeId: file ? getComposerModeForAttachmentRole(args, 'mask') : args.providerModeId,
    targetImage: args.targetImage,
    referenceImages: args.referenceImages,
    mask: file
  });
}
