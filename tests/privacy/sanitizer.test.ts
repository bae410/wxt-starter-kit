import { describe, expect, it } from 'vitest';

import { sanitizeHtmlContent } from '@lib/privacy/sanitizer';

describe('sanitizeHtmlContent', () => {
  it('removes disallowed elements and attributes', () => {
    const input = `
      <div>
        <script>alert('hack');</script>
        <p onclick="doBadThing()">Hello <a href="javascript:alert('hi')">world</a></p>
      </div>
    `;

    const result = sanitizeHtmlContent(input);

    expect(result.html).not.toContain('<script');
    expect(result.html).not.toContain('onclick');
    expect(result.html).not.toContain('javascript:');
  });

  it('masks PII patterns in text nodes', () => {
    const input = `
      <article>
        <p>Email: person@example.com</p>
        <p>Card: 4242 4242 4242 4242</p>
      </article>
    `;

    const result = sanitizeHtmlContent(input);

    expect(result.redactions).toEqual(
      expect.arrayContaining([
        { type: 'email', count: 1 },
        { type: 'credit-card', count: 1 },
      ]),
    );
    expect(result.html).not.toContain('person@example.com');
    expect(result.html).not.toContain('4242 4242 4242 4242');
  });
});
