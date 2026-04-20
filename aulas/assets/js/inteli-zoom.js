/**
 * Inteli Zoom
 * Clicar em uma imagem com a classe `.zoomable` abre um overlay ampliado.
 * Clicar no overlay (ou pressionar Esc) fecha.
 */
(function () {
  function createOverlay(src) {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(29,24,41,0.92);z-index:9999;' +
      'display:flex;align-items:center;justify-content:center;cursor:zoom-out;';

    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:92%;max-height:92%;box-shadow:0 20px 60px rgba(0,0,0,0.6);border-radius:8px;';
    overlay.appendChild(img);

    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }

    overlay.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
  }

  function initAll() {
    document.querySelectorAll('img.zoomable').forEach(function (img) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function () { createOverlay(img.src); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  if (typeof window !== 'undefined') {
    window.InteliZoom = { initAll: initAll };
  }
})();
