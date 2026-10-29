/** Simulation always advances at 60 Hz; rendering may run at any refresh rate. */
export class GameLoop {
  readonly step = 1 / 60;
  private accumulator = 0;
  private previous = 0;
  private frameId = 0;
  private active = false;
  constructor(private update: (dt: number) => void, private render: (alpha: number, dt: number) => void) {}
  start() {
    if (this.active) return;
    this.active = true;
    this.previous = performance.now();
    this.frameId = requestAnimationFrame(this.frame);
  }
  private frame = (now: number) => {
    if (!this.active) return;
    const dt = Math.min(Math.max((now - this.previous) / 1000, 0), 0.1);
    this.previous = now;
    this.accumulator += dt;
    while (this.accumulator >= this.step) { this.update(this.step); this.accumulator -= this.step; }
    this.render(this.accumulator / this.step, dt);
    this.frameId = requestAnimationFrame(this.frame);
  };
  clearAccumulator() { this.accumulator = 0; this.previous = performance.now(); }
  stop() { this.active = false; cancelAnimationFrame(this.frameId); }
}
