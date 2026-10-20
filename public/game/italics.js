// Italics for scientific names, marked between asterisks in config.js:
// "Tia lands on *E. coli* on six long, bendy tail fibers."
// Built from text nodes, never HTML, so a fact or name can't break the page.

// `text` without its italics markers: the words as they read on screen.
export const plainText = (text) => text.replaceAll('*', '');

// `text` as nodes to put on the page, with the parts between asterisks in <i>.
export function withItalics(text) {
  return text
    .split('*')
    .map((part, i) => {
      if (i % 2 === 0) return document.createTextNode(part);
      const italic = document.createElement('i');
      italic.textContent = part;
      return italic;
    })
    .filter((node) => node.textContent !== '');
}
