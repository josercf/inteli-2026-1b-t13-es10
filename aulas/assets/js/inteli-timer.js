/**
 * Inteli Timer
 * Cronômetro regressivo para slides de Daily Time ou atividades.
 *
 * Markup esperado:
 *
 * <div class="inteli-timer" data-minutes="15">
 *   <div class="inteli-timer-display">15:00</div>
 *   <div class="inteli-timer-controls">
 *     <button data-action="start">Iniciar</button>
 *     <button data-action="pause">Pausar</button>
 *     <button data-action="reset">Zerar</button>
 *   </div>
 * </div>
 */
(function () {
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function format(ms) {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return pad(m) + ':' + pad(s);
  }

  function createTimer(el) {
    const totalMinutes = parseFloat(el.dataset.minutes || '15');
    const initialMs = totalMinutes * 60 * 1000;

    const display = el.querySelector('.inteli-timer-display');
    const startBtn = el.querySelector('[data-action="start"]');
    const pauseBtn = el.querySelector('[data-action="pause"]');
    const resetBtn = el.querySelector('[data-action="reset"]');

    let remaining = initialMs;
    let intervalId = null;
    let endTimestamp = null;

    function render() {
      if (display) display.textContent = format(remaining);
      el.classList.toggle('finished', remaining <= 0);
      el.classList.toggle('warning', remaining > 0 && remaining <= 60 * 1000);
    }

    function tick() {
      const now = Date.now();
      remaining = Math.max(0, endTimestamp - now);
      render();
      if (remaining <= 0) stop();
    }

    function start() {
      if (intervalId) return;
      if (remaining <= 0) remaining = initialMs;
      endTimestamp = Date.now() + remaining;
      intervalId = setInterval(tick, 250);
      el.classList.add('running');
      el.classList.remove('paused');
    }

    function stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      el.classList.remove('running');
    }

    function pause() {
      if (!intervalId) return;
      stop();
      el.classList.add('paused');
    }

    function reset() {
      stop();
      remaining = initialMs;
      el.classList.remove('paused');
      render();
    }

    if (startBtn) startBtn.addEventListener('click', start);
    if (pauseBtn) pauseBtn.addEventListener('click', pause);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    render();
  }

  function initAll() {
    document.querySelectorAll('.inteli-timer').forEach(createTimer);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  if (typeof window !== 'undefined') {
    window.InteliTimer = { initAll: initAll };
  }
})();
