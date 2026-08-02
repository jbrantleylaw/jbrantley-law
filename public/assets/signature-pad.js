/**
 * Minimal signature pad — finger, stylus, mouse, or trackpad.
 * No dependencies. Strokes are kept as points so the canvas can be redrawn
 * at the right resolution when the window resizes or rotates.
 */
export class SignaturePad {
  constructor(canvas, { color = '#12233b', minWidth = 1.3, maxWidth = 2.9 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.color = color;
    this.minWidth = minWidth;
    this.maxWidth = maxWidth;
    this.strokes = [];
    this._current = null;
    this._onChange = [];

    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize);
    window.addEventListener('orientationchange', this._resize);
    // The pad is built while its step is still hidden, so it has no size yet.
    // A ResizeObserver picks up the real dimensions the moment the step opens —
    // without it the canvas keeps its 300x150 default and the ink lands in the
    // wrong place.
    if (typeof ResizeObserver !== 'undefined') {
      this._observer = new ResizeObserver(() => this._resize());
      this._observer.observe(canvas);
    }
    this._resize();

    canvas.addEventListener('pointerdown', (e) => this._down(e));
    canvas.addEventListener('pointermove', (e) => this._move(e));
    canvas.addEventListener('pointerup', (e) => this._up(e));
    canvas.addEventListener('pointercancel', (e) => this._up(e));
    canvas.addEventListener('pointerleave', (e) => this._up(e));
    // Stop the page from scrolling or zooming while a finger is drawing.
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  onChange(fn) { this._onChange.push(fn); }
  _emit() { for (const fn of this._onChange) fn(this); }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
    this._redraw();
  }

  _point(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: Date.now() };
  }

  _down(e) {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    this.canvas.setPointerCapture?.(e.pointerId);
    this._current = [this._point(e)];
    this.strokes.push(this._current);
    this._drawDot(this._current[0]);
  }

  _move(e) {
    if (!this._current) return;
    const p = this._point(e);
    const prev = this._current[this._current.length - 1];
    // Ignore sub-pixel jitter so the stored stroke stays compact.
    if (Math.hypot(p.x - prev.x, p.y - prev.y) < 0.7) return;
    this._current.push(p);
    this._drawSegment(this._current, this._current.length - 1);
  }

  _up(e) {
    if (!this._current) return;
    if (this._current.length === 1) this._drawDot(this._current[0]);
    this._current = null;
    this.canvas.releasePointerCapture?.(e.pointerId);
    this._emit();
  }

  /** Faster movement draws a thinner line, which reads as handwriting. */
  _widthFor(a, b) {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const dt = Math.max(b.t - a.t, 1);
    const speed = dist / dt;
    const w = this.maxWidth - speed * 1.6;
    return Math.max(this.minWidth, Math.min(this.maxWidth, w));
  }

  _style(w) {
    const c = this.ctx;
    c.strokeStyle = this.color;
    c.fillStyle = this.color;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = w;
  }

  _drawDot(p) {
    this._style(this.minWidth);
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, this.maxWidth / 2.2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /** Quadratic through the midpoints — cheap smoothing, no lag. */
  _drawSegment(stroke, i) {
    const c = this.ctx;
    const p1 = stroke[i - 1];
    const p2 = stroke[i];
    if (!p1) return;
    this._style(this._widthFor(p1, p2));
    if (i === 1) {
      c.beginPath();
      c.moveTo(p1.x, p1.y);
      c.lineTo(p2.x, p2.y);
      c.stroke();
      return;
    }
    const p0 = stroke[i - 2];
    const m1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const m2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    c.beginPath();
    c.moveTo(m1.x, m1.y);
    c.quadraticCurveTo(p1.x, p1.y, m2.x, m2.y);
    c.stroke();
  }

  _redraw() {
    this.ctx.clearRect(0, 0, this.width || 0, this.height || 0);
    for (const stroke of this.strokes) {
      if (stroke.length === 1) { this._drawDot(stroke[0]); continue; }
      for (let i = 1; i < stroke.length; i++) this._drawSegment(stroke, i);
    }
  }

  clear() {
    this.strokes = [];
    this._current = null;
    this._redraw();
    this._emit();
  }

  undo() {
    this.strokes.pop();
    this._redraw();
    this._emit();
  }

  isEmpty() {
    return this.strokes.every((s) => s.length === 0) || this.strokes.length === 0;
  }

  /** True once there is enough ink that it plausibly is a signature. */
  hasSignature() {
    const points = this.strokes.reduce((n, s) => n + s.length, 0);
    return this.strokes.length > 0 && points >= 4;
  }

  /**
   * PNG data URL cropped to the ink, on a transparent background, rendered at
   * 3x so it stays crisp when placed in the PDF.
   */
  toDataURL(scale = 3) {
    if (this.isEmpty()) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const stroke of this.strokes) {
      for (const p of stroke) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }
    const pad = this.maxWidth * 2 + 4;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(this.width, maxX + pad);
    maxY = Math.min(this.height, maxY + pad);
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);

    const out = document.createElement('canvas');
    out.width = Math.round(w * scale);
    out.height = Math.round(h * scale);
    const octx = out.getContext('2d');
    octx.setTransform(scale, 0, 0, scale, -minX * scale, -minY * scale);

    const real = this.ctx;
    this.ctx = octx;
    for (const stroke of this.strokes) {
      if (stroke.length === 1) { this._drawDot(stroke[0]); continue; }
      for (let i = 1; i < stroke.length; i++) this._drawSegment(stroke, i);
    }
    this.ctx = real;

    return out.toDataURL('image/png');
  }
}
