if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
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
  };
}
