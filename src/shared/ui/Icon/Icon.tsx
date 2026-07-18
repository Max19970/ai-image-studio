import { createElement, forwardRef, type SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: number | string;
  strokeWidth?: number;
}

type IconElement = readonly [
  tag: 'circle' | 'line' | 'path' | 'polyline' | 'rect',
  attributes: Record<string, number | string>
];

function createIcon(displayName: string, elements: readonly IconElement[]) {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function StudioIcon(
    { size = 20, strokeWidth = 1.8, role, ...props },
    ref
  ) {
    const labelled = Boolean(props['aria-label'] || props['aria-labelledby']);

    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        aria-hidden={labelled ? undefined : true}
        role={role ?? (labelled ? 'img' : undefined)}
        {...props}
      >
        {elements.map(([tag, attributes], index) => createElement(tag, { ...attributes, key: index }))}
      </svg>
    );
  });

  Icon.displayName = displayName;
  return Icon;
}

export const XIcon = createIcon('XIcon', [
  ['path', { d: 'M18 6 6 18' }],
  ['path', { d: 'm6 6 12 12' }]
]);

export const CheckIcon = createIcon('CheckIcon', [
  ['path', { d: 'm20 6-11 11-5-5' }]
]);

export const CircleIcon = createIcon('CircleIcon', [
  ['circle', { cx: 12, cy: 12, r: 9 }]
]);

export const CircleCheckIcon = createIcon('CircleCheckIcon', [
  ['circle', { cx: 12, cy: 12, r: 9 }],
  ['path', { d: 'm8.5 12 2.25 2.25L15.75 9' }]
]);

export const CircleAlertIcon = createIcon('CircleAlertIcon', [
  ['circle', { cx: 12, cy: 12, r: 9 }],
  ['path', { d: 'M12 8v4' }],
  ['path', { d: 'M12 16h.01' }]
]);

export const EllipsisIcon = createIcon('EllipsisIcon', [
  ['circle', { cx: 5, cy: 12, r: 1 }],
  ['circle', { cx: 12, cy: 12, r: 1 }],
  ['circle', { cx: 19, cy: 12, r: 1 }]
]);

export const PlusIcon = createIcon('PlusIcon', [
  ['path', { d: 'M12 5v14' }],
  ['path', { d: 'M5 12h14' }]
]);

export const CopyIcon = createIcon('CopyIcon', [
  ['rect', { x: 9, y: 9, width: 11, height: 11, rx: 2 }],
  ['path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }]
]);

export const Trash2Icon = createIcon('Trash2Icon', [
  ['path', { d: 'M3 6h18' }],
  ['path', { d: 'M8 6V4h8v2' }],
  ['path', { d: 'M19 6 18 20H6L5 6' }],
  ['path', { d: 'M10 11v5' }],
  ['path', { d: 'M14 11v5' }]
]);

export const ArrowUpIcon = createIcon('ArrowUpIcon', [
  ['path', { d: 'm5 12 7-7 7 7' }],
  ['path', { d: 'M12 19V5' }]
]);

export const ArrowLeftIcon = createIcon('ArrowLeftIcon', [
  ['path', { d: 'm12 19-7-7 7-7' }],
  ['path', { d: 'M19 12H5' }]
]);

export const RotateCcwIcon = createIcon('RotateCcwIcon', [
  ['path', { d: 'M3 12a9 9 0 1 0 3-6.7L3 8' }],
  ['path', { d: 'M3 3v5h5' }]
]);

export const FolderIcon = createIcon('FolderIcon', [
  ['path', { d: 'M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z' }]
]);

export const FolderOpenIcon = createIcon('FolderOpenIcon', [
  ['path', { d: 'M6 14 8 9h12l-2 8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v1' }]
]);

export const FolderPlusIcon = createIcon('FolderPlusIcon', [
  ['path', { d: 'M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z' }],
  ['path', { d: 'M12 10v5' }],
  ['path', { d: 'M9.5 12.5h5' }]
]);

export const FoldersIcon = createIcon('FoldersIcon', [
  ['path', { d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z' }],
  ['path', { d: 'M5 5V4a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v3' }]
]);

export const PinIcon = createIcon('PinIcon', [
  ['path', { d: 'M12 17v5' }],
  ['path', { d: 'M9 10.5 7 13v2h10v-2l-2-2.5V4l2-2H7l2 2Z' }]
]);

export const SearchIcon = createIcon('SearchIcon', [
  ['circle', { cx: 11, cy: 11, r: 7 }],
  ['path', { d: 'm20 20-3.5-3.5' }]
]);

export const ListFilterIcon = createIcon('ListFilterIcon', [
  ['path', { d: 'M3 6h18' }],
  ['path', { d: 'M6 12h12' }],
  ['path', { d: 'M10 18h4' }]
]);

export const ChevronLeftIcon = createIcon('ChevronLeftIcon', [
  ['path', { d: 'm15 18-6-6 6-6' }]
]);

export const ChevronRightIcon = createIcon('ChevronRightIcon', [
  ['path', { d: 'm9 18 6-6-6-6' }]
]);

export const ChevronDownIcon = createIcon('ChevronDownIcon', [
  ['path', { d: 'm6 9 6 6 6-6' }]
]);

export const DownloadIcon = createIcon('DownloadIcon', [
  ['path', { d: 'M12 3v12' }],
  ['path', { d: 'm7 10 5 5 5-5' }],
  ['path', { d: 'M5 21h14' }]
]);

export const PanelLeftCloseIcon = createIcon('PanelLeftCloseIcon', [
  ['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }],
  ['path', { d: 'M9 3v18' }],
  ['path', { d: 'm16 9-3 3 3 3' }]
]);

export const PanelLeftOpenIcon = createIcon('PanelLeftOpenIcon', [
  ['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }],
  ['path', { d: 'M9 3v18' }],
  ['path', { d: 'm14 9 3 3-3 3' }]
]);

export const ImagesIcon = createIcon('ImagesIcon', [
  ['rect', { x: 3, y: 3, width: 15, height: 15, rx: 2 }],
  ['circle', { cx: 8.5, cy: 8.5, r: 1.5 }],
  ['path', { d: 'm3 15 4-4 3 3 2-2 6 6' }],
  ['path', { d: 'M8 21h11a2 2 0 0 0 2-2V8' }]
]);

export const ImagePlusIcon = createIcon('ImagePlusIcon', [
  ['rect', { x: 3, y: 3, width: 14, height: 14, rx: 2 }],
  ['circle', { cx: 8, cy: 8, r: 1.5 }],
  ['path', { d: 'm3 14 3.5-3.5 3 3 2-2 5.5 5.5' }],
  ['path', { d: 'M20 10v8' }],
  ['path', { d: 'M16 14h8' }]
]);

export const ScanIcon = createIcon('ScanIcon', [
  ['path', { d: 'M3 7V5a2 2 0 0 1 2-2h2' }],
  ['path', { d: 'M17 3h2a2 2 0 0 1 2 2v2' }],
  ['path', { d: 'M21 17v2a2 2 0 0 1-2 2h-2' }],
  ['path', { d: 'M7 21H5a2 2 0 0 1-2-2v-2' }],
  ['rect', { x: 7, y: 7, width: 10, height: 10, rx: 2 }]
]);

export const EraserIcon = createIcon('EraserIcon', [
  ['path', { d: 'm7 21-4-4L15.5 4.5a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L7 21Z' }],
  ['path', { d: 'm11 9 4 4' }],
  ['path', { d: 'M7 21h10' }]
]);

export const InfoIcon = createIcon('InfoIcon', [
  ['circle', { cx: 12, cy: 12, r: 9 }],
  ['path', { d: 'M12 11v5' }],
  ['path', { d: 'M12 8h.01' }]
]);

export const SlidersHorizontalIcon = createIcon('SlidersHorizontalIcon', [
  ['path', { d: 'M3 6h7' }],
  ['path', { d: 'M14 6h7' }],
  ['path', { d: 'M3 12h2' }],
  ['path', { d: 'M9 12h12' }],
  ['path', { d: 'M3 18h10' }],
  ['path', { d: 'M17 18h4' }],
  ['circle', { cx: 12, cy: 6, r: 2 }],
  ['circle', { cx: 7, cy: 12, r: 2 }],
  ['circle', { cx: 15, cy: 18, r: 2 }]
]);

export const GripVerticalIcon = createIcon('GripVerticalIcon', [
  ['circle', { cx: 9, cy: 6, r: 1 }],
  ['circle', { cx: 15, cy: 6, r: 1 }],
  ['circle', { cx: 9, cy: 12, r: 1 }],
  ['circle', { cx: 15, cy: 12, r: 1 }],
  ['circle', { cx: 9, cy: 18, r: 1 }],
  ['circle', { cx: 15, cy: 18, r: 1 }]
]);

export const SparklesIcon = createIcon('SparklesIcon', [
  ['path', { d: 'm12 3-1.1 2.9A4 4 0 0 1 8.5 8.3L5.5 9.5l3 1.2a4 4 0 0 1 2.4 2.4L12 16l1.1-2.9a4 4 0 0 1 2.4-2.4l3-1.2-3-1.2a4 4 0 0 1-2.4-2.4Z' }],
  ['path', { d: 'm5 3 .45 1.2A2 2 0 0 0 6.8 5.55L8 6l-1.2.45A2 2 0 0 0 5.45 7.8L5 9l-.45-1.2A2 2 0 0 0 3.2 6.45L2 6l1.2-.45A2 2 0 0 0 4.55 4.2Z' }],
  ['path', { d: 'm19 16 .55 1.45A2.5 2.5 0 0 0 21.05 19L22.5 19.5l-1.45.55a2.5 2.5 0 0 0-1.5 1.5L19 23l-.55-1.45a2.5 2.5 0 0 0-1.5-1.5L15.5 19.5l1.45-.5a2.5 2.5 0 0 0 1.5-1.55Z' }]
]);

export const ListChecksIcon = createIcon('ListChecksIcon', [
  ['path', { d: 'm3 6 1 1 2-2' }],
  ['path', { d: 'm3 12 1 1 2-2' }],
  ['path', { d: 'm3 18 1 1 2-2' }],
  ['path', { d: 'M9 6h12' }],
  ['path', { d: 'M9 12h12' }],
  ['path', { d: 'M9 18h12' }]
]);

export const Layers3Icon = createIcon('Layers3Icon', [
  ['path', { d: 'm12 2 9 5-9 5-9-5Z' }],
  ['path', { d: 'm3 12 9 5 9-5' }],
  ['path', { d: 'm3 17 9 5 9-5' }]
]);

export const TagIcon = createIcon('TagIcon', [
  ['path', { d: 'M20 13 13 20l-9-9V4h7Z' }],
  ['circle', { cx: 8.5, cy: 8.5, r: 1.5 }]
]);
