export interface Redaction {
  type: 'email' | 'credit-card';
  count: number;
}

export interface SanitizedHtml {
  html: string;
  redactions: Redaction[];
}

const ALLOWED_TAGS = new Set([
  'A',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'BODY',
  'BR',
  'CAPTION',
  'CODE',
  'DIV',
  'EM',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'H1',
  'H2',
  'H3',
  'H4',
  'HEADER',
  'HR',
  'IMG',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'SMALL',
  'SPAN',
  'STRONG',
  'SUB',
  'SUP',
  'TABLE',
  'TBODY',
  'TD',
  'TH',
  'THEAD',
  'TR',
  'UL',
]);

const ALLOWED_ATTRS = new Set(['href', 'src', 'alt', 'title', 'scope', 'colspan', 'rowspan']);

const PATTERNS = [
  {
    type: 'email' as const,
    create: () => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    mask: '***@***.***',
  },
  {
    type: 'credit-card' as const,
    create: () => /\b(?:\d[ -]?){13,16}\b/g,
    mask: '**** **** **** ****',
  },
];

export function sanitizeHtmlContent(html: string): SanitizedHtml {
  if (!html) {
    return { html: '', redactions: [] };
  }

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const container = doc.body;

  removeBlockedNodes(container);
  pruneDisallowedElements(container, doc);

  const redactionCounts: Record<Redaction['type'], number> = {
    email: 0,
    'credit-card': 0,
  };

  const textWalker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let textNode: Text | null;

  while ((textNode = textWalker.nextNode() as Text | null)) {
    if (!textNode) break;

    const original = textNode.nodeValue ?? '';
    let updated = original;

    for (const pattern of PATTERNS) {
      const regex = pattern.create();
      const matches = [...updated.matchAll(regex)];
      if (matches.length === 0) continue;
      redactionCounts[pattern.type] += matches.length;
      updated = updated.replace(regex, pattern.mask);
    }

    if (updated !== original) {
      textNode.nodeValue = updated;
    }
  }

  const redactions = PATTERNS.map(({ type }) => ({ type, count: redactionCounts[type] })).filter(
    ({ count }) => count > 0,
  );

  return {
    html: container.innerHTML.trim(),
    redactions,
  };
}

function removeBlockedNodes(container: HTMLElement) {
  const blocked = ['script', 'style', 'iframe', 'noscript', 'form', 'input', 'button'];
  container.querySelectorAll(blocked.join(',')).forEach((node) => node.remove());
}

function pruneDisallowedElements(container: HTMLElement, doc: Document) {
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
  let current: Element | null;

  while ((current = walker.nextNode() as Element | null)) {
    if (!current) break;

    if (!ALLOWED_TAGS.has(current.tagName)) {
      const textContent = current.textContent ?? '';
      const replacement = doc.createTextNode(textContent);
      current.replaceWith(replacement);
      continue;
    }

    const el = current;
    Array.from(el.attributes).forEach((attr) => {
      if (!ALLOWED_ATTRS.has(attr.name)) {
        el.removeAttribute(attr.name);
        return;
      }

      if ((attr.name === 'href' || attr.name === 'src') && !isSafeUrl(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
  }
}

function isSafeUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith('javascript:') || normalized.startsWith('data:')) {
    return false;
  }
  return true;
}
