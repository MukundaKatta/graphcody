import { describe, it, expect } from "vitest";
import { Graphcody } from "../src/core.js";
describe("Graphcody", () => {
  it("init", () => { expect(new Graphcody().getStats().ops).toBe(0); });
  it("op", async () => { const c = new Graphcody(); await c.process(); expect(c.getStats().ops).toBe(1); });
  it("reset", async () => { const c = new Graphcody(); await c.process(); c.reset(); expect(c.getStats().ops).toBe(0); });
});
