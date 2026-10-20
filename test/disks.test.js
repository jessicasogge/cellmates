// @vitest-environment jsdom
// placeDisks adds the disks to the page, so these tests run in jsdom, a
// simulated browser page.
import { beforeEach, describe, expect, it } from 'vitest';
import { disksFor, placeDisks } from '../public/game/antiviral.js';
import { ANTIBIOTIC, SPECIES } from '../public/game/config.js';

beforeEach(() => {
  document.body.innerHTML = '<div class="agar"></div>';
});

describe('placing the disks', () => {
  it('puts one disk per drug on the agar, labeled with its code', () => {
    const disks = placeDisks(SPECIES.tia.disks.slice(0, 3));
    const els = [...document.querySelectorAll('.agar .disk')];
    expect(els.map((el) => el.textContent)).toEqual(['AB', 'BL', 'I']);
    expect(disks.map((d) => d.el)).toEqual(els);
    expect(disks.map((d) => d.drug)).toEqual(SPECIES.tia.disks.slice(0, 3));
  });

  it('names it for the hover label, starting with a capital letter', () => {
    placeDisks([{ code: 'BL', name: 'bleach', zone: 20 }]);
    expect(document.querySelector('.disk').dataset.name).toBe('Bleach');
  });

  it('tells screen readers what the disk is and to stay away', () => {
    placeDisks([{ code: 'I', name: 'iodine', zone: 20 }]);
    expect(document.querySelector('.disk').getAttribute('aria-label'))
      .toBe("Disk: iodine. Don't touch it or the clear zone around it!");
  });

  it("doesn't also show the browser's own slow tooltip", () => {
    placeDisks([{ code: 'I', name: 'iodine', zone: 20 }]);
    expect(document.querySelector('.disk').hasAttribute('title')).toBe(false);
  });
});

describe('the antibiotic disk', () => {
  it('is marked harmless and looks different, and so does its zone', () => {
    const [disk] = placeDisks(disksFor([], 0, ANTIBIOTIC));
    expect(disk.harmless).toBe(true);
    expect(disk.el.classList).toContain('antibiotic');
    expect(disk.zoneEl.classList).toContain('antibiotic-zone');
    expect(disk.fullZone).toBeGreaterThan(0); // it still clears the lawn
  });

  it("tells screen readers it can't hurt a virus", () => {
    placeDisks(disksFor([], 0, ANTIBIOTIC));
    expect(document.querySelector('.disk').getAttribute('aria-label'))
      .toBe("Antibiotic disk: ampicillin. It kills the bacteria around it but can't hurt a virus, so you can swim through it.");
  });

  it('is the disk that stops viruses only when it says so', () => {
    const disks = placeDisks(disksFor(SPECIES.tia.disks, 1, ANTIBIOTIC));
    expect(disks.map((d) => d.harmless)).toEqual([true, false]);
  });
});
