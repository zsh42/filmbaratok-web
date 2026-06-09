export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue
        const dialog =
          node.matches?.('.p-dialog, .p-dialog-mask') ? node : node.querySelector?.('.p-dialog')
        if (!dialog) continue
        const closeBtn = dialog.querySelector<HTMLElement>('.p-dialog-close-button')
        if (!closeBtn) continue
        const onFocusin = (e: Event) => {
          if (e.target === closeBtn) closeBtn.blur()
        }
        dialog.addEventListener('focusin', onFocusin, { once: true, capture: true })
      }
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
})
