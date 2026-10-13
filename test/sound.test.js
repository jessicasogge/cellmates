// @vitest-environment jsdom
// sound.js: the pop of a bursting cell, climbing up a scale in a chain.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pop, popPitch, resetSound } from '../public/game/sound.js';

describe('popPitch', () => {
  it('climbs a major scale with each pop in a chain', () => {
    expect(popPitch(1)).toBeCloseTo(330);
    expect(popPitch(2)).toBeCloseTo(330 * 2 ** (2 / 12));
    expect(popPitch(8)).toBeCloseTo(660); // an octave up
    expect(popPitch(2)).toBeGreaterThan(popPitch(1));
  });

  it('stays at the top for long chains, and at the bottom for nonsense', () => {
    expect(popPitch(100)).toBe(popPitch(15));
    expect(popPitch(0)).toBe(popPitch(1));
  });
});

describe('pop', () => {
  afterEach(() => {
    resetSound();
    vi.unstubAllGlobals();
  });

  // A stand-in for the Web Audio API that records the notes played.
  function fakeAudio() {
    const played = [];
    const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
    class FakeContext {
      currentTime = 0;
      destination = {};
      createOscillator() {
        const tone = { frequency: param(), connect: (next) => next, start: () => played.push(tone), stop: vi.fn() };
        return tone;
      }
      createGain() {
        return { gain: param(), connect: (next) => next };
      }
    }
    return { FakeContext, played };
  }

  it('plays a note, reusing one audio context', () => {
    const { FakeContext, played } = fakeAudio();
    const made = vi.fn();
    vi.stubGlobal('AudioContext', class extends FakeContext {
      constructor() {
        super();
        made();
      }
    });
    pop(1);
    pop(2);
    expect(played).toHaveLength(2);
    expect(made).toHaveBeenCalledTimes(1);
  });

  it('uses the older Safari name if that’s all there is', () => {
    const { FakeContext, played } = fakeAudio();
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', FakeContext);
    pop(1);
    expect(played).toHaveLength(1);
  });

  it('stays quiet, without breaking, where there is no sound', () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    expect(() => pop(1)).not.toThrow();
  });
});
