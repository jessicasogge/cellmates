// @vitest-environment jsdom
// Italics for scientific names, marked between asterisks in config.js.
import { describe, expect, it } from 'vitest';
import { plainText, withItalics } from '../public/game/italics.js';

// Nodes as "text" and "<i>italic</i>", to compare easily.
const shown = (nodes) => nodes.map((n) => (n.nodeName === 'I' ? `<i>${n.textContent}</i>` : n.textContent)).join('');

describe('italics', () => {
  it('drops the markers for the words as they read on screen', () => {
    expect(plainText('Tia infects *E. coli*.')).toBe('Tia infects E. coli.');
    expect(plainText('Bacteriophage T4')).toBe('Bacteriophage T4');
  });

  it('puts the parts between asterisks in <i>, as text, never HTML', () => {
    expect(shown(withItalics('A host, *Escherichia coli*, too.'))).toBe('A host, <i>Escherichia coli</i>, too.');
    const [italic] = withItalics('*<b>bold</b>*');
    expect(italic.textContent).toBe('<b>bold</b>');
    expect(italic.querySelector('b')).toBeNull();
  });

  it('leaves out empty pieces at the ends', () => {
    expect(withItalics('*E. coli* lawn')).toHaveLength(2);
  });
});
