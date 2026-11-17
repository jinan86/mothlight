// MOTHLIGHT — keyboard and mouse. WASD or arrows steer, Space or Shift dashes,
// mouse steers toward the pointer while held, P or Escape pauses, M mutes,
// Enter or Space confirms on menus, 1/2/3 picks a boon.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas) {
  const keys = new Set();
  let mouse = { x: 0, y: 0, down: false };
  let queued = 0;
  let dashQueued = false;
  let boonPick = 0;

  function keyOf(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  window.addEventListener('keydown', (event) => {
    const k = keyOf(event);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) event.preventDefault();
    if (event.repeat) return;
    keys.add(k);
    if (k === ' ' || k === 'enter') queued |= ACTION_CONFIRM;
    if (k === 'p' || k === 'escape') queued |= ACTION_PAUSE;
    if (k === 'shift') dashQueued = true;
    if (k === ' ') dashQueued = true;
    if (k === 'm') queued |= ACTION_MUTE;
    if (k === '1' || k === '2' || k === '3') boonPick = Number(k);
  });
  window.addEventListener('keyup', (event) => keys.delete(keyOf(event)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top, down: true };
    queued |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });
  window.addEventListener('pointerup', () => {
    mouse.down = false;
  });

  function axis(neg, pos) {
    let v = 0;
    if (keys.has(neg)) v -= 1;
    if (keys.has(pos)) v += 1;
    return v;
  }

  return {
    // Movement vector for this frame: keys first, mouse-steer while held.
    // Returns {x, y, dash} with x/y in [-1, 1]; dash is an edge trigger.
    move(playerX, playerY, scaleX, scaleY) {
      let x = axis('a', 'd') + axis('arrowleft', 'arrowright');
      let y = axis('w', 's') + axis('arrowup', 'arrowdown');
      if (x === 0 && y === 0 && mouse.down) {
        const dx = mouse.x * scaleX - playerX;
        const dy = mouse.y * scaleY - playerY;
        const d = Math.hypot(dx, dy);
        if (d > 12) {
          x = dx / d;
          y = dy / d;
        }
      }
      const len = Math.hypot(x, y);
      if (len > 1) {
        x /= len;
        y /= len;
      }
      const dash = dashQueued;
      dashQueued = false;
      return { x, y, dash };
    },
    takeActions() {
      const out = queued;
      queued = 0;
      return out;
    },
    takeBoonPick() {
      const out = boonPick;
      boonPick = 0;
      return out;
    },
    // Where the pointer is, in canvas pixels (for boon-card clicks).
    pointer() {
      return { x: mouse.x, y: mouse.y, down: mouse.down };
    },
  };
}
