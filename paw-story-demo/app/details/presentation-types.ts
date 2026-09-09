export type PresentationSource = { label: string; href: string };
export type PresentationNode = { label: string; detail: string };
export type PresentationVisual =
  | { kind: 'flow'; nodes: PresentationNode[]; caption?: string }
  | { kind: 'layers'; nodes: PresentationNode[]; caption?: string }
  | { kind: 'contrast'; before: { label: string; lines: string[] }; after: { label: string; lines: string[] }; caption?: string }
  | { kind: 'metrics'; beforeLabel?:string; afterLabel?:string; rows: { label: string; before: string; after: string; note: string }[]; caption?: string }
  | { kind: 'timeline'; nodes: PresentationNode[]; caption?: string }
  | { kind: 'ranking' }
  | { kind: 'native'; id: string; route: string; title: string };
export type PresentationSlide = {
  id: string;
  title: string;
  takeaway: string;
  visual: PresentationVisual;
  notes: string[];
  sources: PresentationSource[];
};
export type PresentationDeck = { id: string; title: string; summary: string; slides: PresentationSlide[] };
