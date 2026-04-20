/**
 * Inteli Quiz
 * Usado em slides com a classe `.quiz-slide` ou blocos `.quiz-container`.
 *
 * Markup esperado:
 *
 * <div class="quiz-container">
 *   <p class="quiz-question">Pergunta?</p>
 *   <ul class="quiz-options">
 *     <li data-correct="true">Opção A</li>
 *     <li data-correct="false">Opção B</li>
 *   </ul>
 *   <div class="quiz-feedback"
 *        data-correct-msg="Explicação quando o aluno acertar"
 *        data-incorrect-msg="Explicação quando o aluno errar"></div>
 * </div>
 */
(function () {
  function initQuiz(container) {
    const options = container.querySelectorAll('.quiz-options li');
    const feedback = container.querySelector('.quiz-feedback');

    options.forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (container.classList.contains('answered')) return;
        container.classList.add('answered');

        const isCorrect = opt.dataset.correct === 'true';
        opt.classList.add(isCorrect ? 'correct' : 'incorrect');

        if (!isCorrect) {
          options.forEach(function (o) {
            if (o.dataset.correct === 'true') o.classList.add('correct');
          });
        }

        if (feedback) {
          const msg = isCorrect ? feedback.dataset.correctMsg : feedback.dataset.incorrectMsg;
          if (msg) feedback.textContent = msg;
          feedback.classList.add('visible', isCorrect ? 'success' : 'error');
        }
      });
    });
  }

  function initAll() {
    document.querySelectorAll('.quiz-container').forEach(initQuiz);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  if (typeof window !== 'undefined') {
    window.InteliQuiz = { initAll: initAll };
  }
})();
