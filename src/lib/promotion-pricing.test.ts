import { describe, expect, test } from "bun:test";
import {
  calculateDiscountedPriceCents,
  isPromotionCurrentlyActive,
  normalizePromotionCode,
  promotionAppliesToProduct,
  selectBestPromotion,
  type PromotionCandidate,
} from "./promotion-pricing";

const now = new Date("2026-07-14T10:00:00.000Z");

function promotion(
  values: Partial<PromotionCandidate> = {},
): PromotionCandidate {
  return {
    active: true,
    allProducts: false,
    code: "ETE20",
    endsAt: new Date("2026-07-20T10:00:00.000Z"),
    id: 1,
    percentOff: 20,
    productIds: [3],
    startsAt: new Date("2026-07-10T10:00:00.000Z"),
    ...values,
  };
}

describe("promotion pricing", () => {
  test("normalizes promotion codes", () => {
    expect(normalizePromotionCode("  ete-20 ")).toBe("ETE-20");
  });

  test("keeps cent precision when applying a percentage", () => {
    expect(calculateDiscountedPriceCents(3_500, 15)).toBe(2_975);
  });

  test("enforces the configured time window", () => {
    expect(isPromotionCurrentlyActive(promotion(), now)).toBe(true);
    expect(
      isPromotionCurrentlyActive(
        promotion({ endsAt: new Date("2026-07-14T10:00:00.000Z") }),
        now,
      ),
    ).toBe(false);
  });

  test("supports selected products and all-products promotions", () => {
    expect(promotionAppliesToProduct(promotion(), 3)).toBe(true);
    expect(promotionAppliesToProduct(promotion(), 4)).toBe(false);
    expect(
      promotionAppliesToProduct(promotion({ allProducts: true }), 4),
    ).toBe(true);
  });

  test("selects the strongest applicable active promotion", () => {
    const selected = selectBestPromotion(
      [
        promotion({ id: 1, percentOff: 10 }),
        promotion({ id: 2, percentOff: 25 }),
        promotion({ id: 3, percentOff: 40, productIds: [8] }),
      ],
      3,
      now,
    );

    expect(selected?.id).toBe(2);
  });
});
