/**
 * Inteli PDF Export
 *
 * Adiciona um botão flutuante que exporta a aula inteira (todos os slides) em PDF,
 * usando o modo de impressão nativo do Reveal.js.
 *
 * Como funciona:
 * 1. Se a URL já contém `?print-pdf`, o Reveal.js entra em modo paginado.
 * 2. O botão abre a URL com `?print-pdf` em uma nova aba e dispara window.print()
 *    automaticamente depois que a página estiver pronta.
 * 3. O usuário escolhe "Salvar como PDF" no diálogo de impressão do navegador.
 */
(function () {
  function isPrintPdfMode() {
    return /print-pdf/gi.test(window.location.search);
  }

  function buildPrintUrl() {
    var url = new URL(window.location.href);
    url.searchParams.set('print-pdf', '');
    url.hash = '';
    return url.toString();
  }

  function injectButton() {
    if (document.getElementById('inteli-pdf-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'inteli-pdf-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Exportar aula em PDF');
    btn.title = 'Exportar aula em PDF';
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '<path fill="currentColor" d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm8 1.5V8h4.5L14 3.5Z"/>' +
      '<text x="12" y="17" text-anchor="middle" font-size="6" font-weight="700" fill="#fff" font-family="Arial, sans-serif">PDF</text>' +
      '</svg>' +
      '<span>PDF</span>';

    btn.addEventListener('click', function () {
      var win = window.open(buildPrintUrl(), '_blank');
      if (!win) {
        alert(
          'O navegador bloqueou a nova aba. Libere pop-ups desta página e tente de novo.'
        );
      }
    });

    document.body.appendChild(btn);
  }

  function triggerPrintWhenReady() {
    var attempts = 0;
    function tryPrint() {
      attempts += 1;
      var deck = window.Reveal;
      if (deck && typeof deck.isReady === 'function' && deck.isReady()) {
        setTimeout(function () {
          window.print();
        }, 500);
        return;
      }
      if (attempts < 40) setTimeout(tryPrint, 200);
    }
    tryPrint();
  }

  function init() {
    if (isPrintPdfMode()) {
      triggerPrintWhenReady();
      return;
    }
    injectButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
