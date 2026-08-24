/**
 * O Node >= 26 expõe um `localStorage` global experimental como accessor
 * somente leitura, o que impede o ambiente jsdom do Vitest de publicar o seu
 * próprio localStorage no escopo global dos testes (a atribuição falha em
 * silêncio e o global permanece undefined). Redefinimos a propriedade com uma
 * implementação em memória quando ela não estiver funcional.
 */
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => void store.set(String(key), String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

const probe = globalThis.localStorage;
if (typeof probe === 'undefined' || typeof probe?.setItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
}
