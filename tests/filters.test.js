import { describe, expect, it } from "vitest";
import { formatHour, hoursInRange, inHourRange } from "../src/filters.js";

describe("inHourRange", () => {
  it("handles a normal range", () => {
    expect(inHourRange(8, 7, 9)).toBe(true);
    expect(inHourRange(10, 7, 9)).toBe(false);
  });

  it("includes both ends", () => {
    expect(inHourRange(7, 7, 9)).toBe(true);
    expect(inHourRange(9, 7, 9)).toBe(true);
  });

  it("handles a range that crosses midnight", () => {
    expect(inHourRange(23, 22, 4)).toBe(true);
    expect(inHourRange(2, 22, 4)).toBe(true);
    expect(inHourRange(12, 22, 4)).toBe(false);
  });
});

describe("hoursInRange", () => {
  it("returns every hour for the full day", () => {
    expect(hoursInRange(0, 23)).toHaveLength(24);
  });

  it("wraps around midnight", () => {
    expect(hoursInRange(22, 1)).toEqual([0, 1, 22, 23]);
  });

  it("returns one hour when start equals end", () => {
    expect(hoursInRange(5, 5)).toEqual([5]);
  });
});

describe("formatHour", () => {
  it("pads to two digits", () => {
    expect(formatHour(7)).toBe("07:00");
    expect(formatHour(23)).toBe("23:00");
  });
});
