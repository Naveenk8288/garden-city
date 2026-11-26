/**
 * Safe DOM Construction Helpers:
 * Replaces dynamic innerHTML assignments with pure DOM node creation + textContent
 * so XSS / HTML injection is structurally impossible (OWASP ASVS V5 / eslint-plugin-no-unsanitized).
 */

export type ChildNodeLike = Node | string | number | null | undefined | false;

export interface ElOptions {
  className?: string;
  id?: string;
  text?: string;
  attrs?: Record<string, string>;
  style?: Partial<CSSStyleDeclaration>;
  onClick?: (e: MouseEvent) => void;
}

export function clearChildren(node: Element): void {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

export function appendChildren(parent: Element, children: ChildNodeLike[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      parent.appendChild(document.createTextNode(String(child)));
    } else {
      parent.appendChild(child);
    }
  }
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts?: ElOptions,
  ...children: ChildNodeLike[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (opts?.id) node.id = opts.id;
  if (opts?.className) node.className = opts.className;
  if (opts?.text !== undefined) node.textContent = opts.text;
  if (opts?.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) {
      // Block inline event handlers and javascript: URLs even via attribute helper
      if (k.toLowerCase().startsWith('on')) continue;
      if ((k.toLowerCase() === 'href' || k.toLowerCase() === 'src') && /^\s*javascript:/i.test(v)) continue;
      node.setAttribute(k, v);
    }
  }
  if (opts?.style) {
    Object.assign(node.style, opts.style);
  }
  if (opts?.onClick) {
    const handler = opts.onClick;
    node.addEventListener('click', (e) => handler(e as MouseEvent));
  }
  if (children.length > 0) {
    appendChildren(node, children);
  }
  return node;
}
