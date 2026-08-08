type ActuallyRuntimeBindings = {
  BUCKET?: R2Bucket;
};

const BINDINGS_KEY = Symbol.for("actually.runtime-bindings");

type GlobalWithActuallyBindings = typeof globalThis & {
  [BINDINGS_KEY]?: ActuallyRuntimeBindings;
};

export function installRuntimeBindings(bindings: ActuallyRuntimeBindings) {
  (globalThis as GlobalWithActuallyBindings)[BINDINGS_KEY] = bindings;
}

export function runtimeBindings() {
  return (globalThis as GlobalWithActuallyBindings)[BINDINGS_KEY] || {};
}
