# Gallery archive UX audit

Stage 9 turns the gallery from a short session list into a scalable archive surface.

## Current behavior after Stage 9

- Remote generation history loads with `assetMode=thumbnail` by default.
- Gallery cards render thumbnail assets and do not hydrate full image payloads on initial reload.
- Detail surfaces lazy-load the full stored image for the active asset when needed.
- Download actions on thumbnail-loaded cards fetch the full asset before triggering the download.
- Persistence rehydrates thumbnail-loaded images before saving so the encrypted full assets are not overwritten by thumbnail data.
- Gallery rendering is bounded by progressive paging: first 48 cards, then `Show more`.
- Header controls provide search, status filter, kind filter, sort and reset.

## Search/filter/sort model

Implemented in `src/features/gallery/model/galleryArchive.ts`.

Search checks:

- task id;
- status;
- kind;
- prompt;
- provider label;
- model id/label;
- task error;
- batch item prompts.

Filters:

- status: all, active, terminal, succeeded, failed, cancelled;
- kind: all, single, batch.

Sort modes:

- newest;
- oldest;
- updated;
- most images.

## Scale notes

The current approach is intentionally simpler than virtualization:

- it avoids adding another rendering abstraction;
- it keeps slot-based card composition intact;
- it limits mounted cards to a predictable page size;
- it works well with CSS `content-visibility` already present on cards.

Virtualization should only be considered if real histories above several hundred tasks still feel heavy after this pass.

## Deferred

Bulk cleanup/export was not added in Stage 9. Current cleanup remains:

- delete a single task from a card;
- clear all results from the header.

Bulk selection/export should be a separate interaction design pass, likely with a compact archive mode or drawer. It should not be bolted onto the normal gallery card grid.

## Manual checks

Recommended real-browser smoke tests:

1. Reload app with a saved image history.
2. Confirm gallery thumbnails appear without loading full assets in every card.
3. Open a detail page and confirm the active image hydrates to full quality.
4. Download from a gallery card after reload and confirm it downloads the full image, not the thumbnail.
5. Search by prompt/model/provider.
6. Try status/kind filters and reset.
7. Use `Show more` on a large archive.
