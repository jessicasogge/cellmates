// A stand-in for a canvas's 2D drawing context, for tests: jsdom has no real
// canvas. It accepts any drawing call and setting, and records the calls.
export function fakeContext() {
  const calls = [];
  const settings = {};
  return new Proxy(settings, {
    get(target, name) {
      if (name === 'calls') return calls;
      if (name in target) return target[name];
      return (...args) => calls.push([name, ...args]);
    },
    set(target, name, value) {
      target[name] = value;
      return true;
    },
  });
}
