(() => {
  'use strict';

  const GRID = 20;
  const STORAGE_KEY = 'green-snake-best-score';
  const DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const board = document.querySelector('#board-shell');
  const overlay = document.querySelector('#overlay');
  const overlayIcon = document.querySelector('#overlay-icon');
  const overlayTitle = document.querySelector('#overlay-title');
  const overlayText = document.querySelector('#overlay-text');
  const overlayButton = document.querySelector('#overlay-button');
  const status = document.querySelector('#status');
  const scoreElement = document.querySelector('#score');
  const bestElement = document.querySelector('#best-score');
  const levelElement = document.querySelector('#level');
  const progressElement = document.querySelector('#level-progress');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');

  let snake, food, direction, nextDirection, score, state, timer, directionQueued;
  let best = 0;
  try { best = Number(localStorage.getItem(STORAGE_KEY)) || 0; } catch (_) { /* Storage can be disabled. */ }

  function formatScore(value) { return String(value).padStart(2, '0'); }
  function level() { return Math.floor(score / 5) + 1; }
  function tickDelay() { return Math.max(75, 185 - (level() - 1) * 15); }

  function updateDisplay() {
    scoreElement.textContent = formatScore(score);
    bestElement.textContent = formatScore(best);
    levelElement.textContent = formatScore(level());
    progressElement.style.width = `${(score % 5) * 20}%`;
    status.textContent = { ready: '等待开始', running: '游戏进行中', paused: '已暂停', over: '游戏结束' }[state];
    pauseButton.disabled = state === 'ready' || state === 'over';
    pauseButton.firstChild.textContent = state === 'paused' ? '继续游戏 ' : '暂停游戏 ';
  }

  function showOverlay(icon, title, description, action) {
    overlayIcon.textContent = icon;
    overlayTitle.textContent = title;
    overlayText.textContent = description;
    overlayButton.firstChild.textContent = `${action} `;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() { overlay.classList.add('hidden'); }

  function randomFood() {
    const free = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!snake.some(segment => segment.x === x && segment.y === y)) free.push({ x, y });
      }
    }
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  function reset() {
    clearTimeout(timer);
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    direction = DIRECTIONS.right;
    nextDirection = direction;
    directionQueued = false;
    score = 0;
    food = randomFood();
    state = 'ready';
    updateDisplay();
    draw();
    showOverlay('✦', '准备好出发了吗？', '吃下果实，避开墙壁和自己的身体。', '开始游戏');
  }

  function start() {
    if (state === 'over') reset();
    if (state === 'running') return;
    state = 'running';
    hideOverlay();
    updateDisplay();
    scheduleTick();
  }

  function pause() {
    if (state === 'running') {
      state = 'paused';
      clearTimeout(timer);
      showOverlay('Ⅱ', '稍作休息', '准备好了就继续前进。', '继续游戏');
    } else if (state === 'paused') {
      start();
      return;
    }
    updateDisplay();
  }

  function end(won = false) {
    clearTimeout(timer);
    state = 'over';
    updateDisplay();
    showOverlay(won ? '★' : '↺', won ? '你占领了整片绿野！' : '游戏结束', `本局获得 ${score} 分，再来挑战一次吧。`, '再玩一次');
  }

  function scheduleTick() { timer = setTimeout(tick, tickDelay()); }

  function tick() {
    direction = nextDirection;
    directionQueued = false;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const eating = food && head.x === food.x && head.y === food.y;
    const body = eating ? snake : snake.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID || body.some(segment => segment.x === head.x && segment.y === head.y)) {
      end();
      return;
    }
    snake.unshift(head);
    if (eating) {
      score++;
      if (score > best) {
        best = score;
        try { localStorage.setItem(STORAGE_KEY, String(best)); } catch (_) { /* Keep playing without persistence. */ }
      }
      food = randomFood();
      updateDisplay();
      if (!food) { draw(); end(true); return; }
    } else {
      snake.pop();
    }
    draw();
    scheduleTick();
  }

  function setDirection(name) {
    const requested = DIRECTIONS[name];
    if (!requested) return;
    if (state === 'ready') start();
    if (state !== 'running' || directionQueued) return;
    if (requested.x === -direction.x && requested.y === -direction.y) return;
    nextDirection = requested;
    directionQueued = true;
  }

  function roundedCell(x, y, color, inset, radius) {
    const size = canvas.width / GRID;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x * size + inset, y * size + inset, size - inset * 2, size - inset * 2, radius);
    ctx.fill();
  }

  function draw() {
    const size = canvas.width / GRID;
    ctx.fillStyle = '#203b2b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if ((x + y) % 2 === 0) roundedCell(x, y, '#25432f', 0, 0);
      }
    }
    if (food) {
      ctx.fillStyle = '#ff815f';
      ctx.shadowColor = '#ff815f';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc((food.x + .5) * size, (food.y + .53) * size, size * .31, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#b9e278';
      ctx.beginPath();
      ctx.ellipse((food.x + .62) * size, (food.y + .22) * size, size * .14, size * .07, -.55, 0, Math.PI * 2);
      ctx.fill();
    }
    snake.forEach((segment, index) => roundedCell(segment.x, segment.y, index === 0 ? '#d8f377' : (index % 2 ? '#85c86f' : '#9cdb78'), 2.1, 8));
    const head = snake[0];
    if (head) {
      ctx.fillStyle = '#244229';
      const perpendicular = { x: -direction.y, y: direction.x };
      for (const side of [-1, 1]) {
        const eyeX = (head.x + .5 + direction.x * .15 + perpendicular.x * side * .15) * size;
        const eyeY = (head.y + .5 + direction.y * .15 + perpendicular.y * side * .15) * size;
        ctx.beginPath(); ctx.arc(eyeX, eyeY, size * .055, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  document.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    const mapping = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };
    if (mapping[key]) { event.preventDefault(); setDirection(mapping[key]); }
    else if (event.code === 'Space') { event.preventDefault(); if (state === 'ready') start(); else pause(); }
    else if (key === 'r') { event.preventDefault(); reset(); start(); }
  });
  document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => setDirection(button.dataset.direction)));
  overlayButton.addEventListener('click', start);
  pauseButton.addEventListener('click', pause);
  restartButton.addEventListener('click', () => { reset(); start(); });

  let touchStart = null;
  board.addEventListener('touchstart', event => { touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }, { passive: true });
  board.addEventListener('touchend', event => {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, { passive: true });

  reset();
})();
