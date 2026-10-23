if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.window.history === 'undefined') {
  globalThis.window.history = {
    pushState: () => {},
    replaceState: () => {},
  };
}
if (typeof globalThis.window.location === 'undefined') {
  globalThis.window.location = {
    href: 'http://localhost/',
    pathname: '/',
    search: '',
    hash: '',
  };
}
if (typeof globalThis.window.addEventListener === 'undefined') {
  globalThis.window.addEventListener = () => {};
  globalThis.window.removeEventListener = () => {};
}
if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = { userAgent: 'node' };
}
if (typeof globalThis.document === 'undefined') {
  const head = { appendChild: () => {} };
  globalThis.document = {
    createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {} }),
    getElementsByTagName: () => [head],
    head,
    body: { appendChild: () => {} },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}
