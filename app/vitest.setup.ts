import "@testing-library/jest-dom/vitest"

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

const consoleError = console.error
const suppressedMessages = [/ReactDOMServer does not yet support Suspense/, /Warning: /]
console.error = (...args: unknown[]) => {
  if (typeof args[0] === "string" && suppressedMessages.some((msg) => msg.test(args[0] as string))) {
    return
  }
  consoleError(...args)
}

class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = StubResizeObserver
}

const elementProto = Element.prototype as unknown as {
  hasPointerCapture?: (pointerId: number) => boolean
  setPointerCapture?: (pointerId: number) => void
  releasePointerCapture?: (pointerId: number) => void
  scrollIntoView?: (arg?: boolean | ScrollIntoViewOptions) => void
}

if (!elementProto.hasPointerCapture) {
  elementProto.hasPointerCapture = () => false
}

if (!elementProto.setPointerCapture) {
  elementProto.setPointerCapture = () => {}
}

if (!elementProto.releasePointerCapture) {
  elementProto.releasePointerCapture = () => {}
}

if (!elementProto.scrollIntoView) {
  elementProto.scrollIntoView = () => {}
}
