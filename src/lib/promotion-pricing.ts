export const MIN_CHECKOUT_AMOUNT_CENTS = 50;

export const PROMOTION_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

export type PromotionCandidate = {
  active: boolean;
  allProducts: boolean;
  code: string;
  endsAt: Date;
  id: number;
  percentOff: number;
  productIds: number[];
  startsAt: Date;
};

export function normalizePromotionCode(value: string) {
  return value.trim().toUpperCase();
}

export function isValidPromotionCode(value: string) {
  return PROMOTION_CODE_PATTERN.test(normalizePromotionCode(value));
}

export function calculateDiscountedPriceCents(
  originalPriceCents: number,
  percentOff: number,
) {
  if (
    !Number.isSafeInteger(originalPriceCents) ||
    originalPriceCents < 1 ||
    !Number.isSafeInteger(percentOff) ||
    percentOff < 1 ||
    percentOff > 99
  ) {
    throw new Error("Invalid promotion price calculation.");
  }

  return Math.round((originalPriceCents * (100 - percentOff)) / 100);
}

export function isPromotionCurrentlyActive(
  promotion: Pick<PromotionCandidate, "active" | "endsAt" | "startsAt">,
  now = new Date(),
) {
  return (
    promotion.active &&
    promotion.startsAt.getTime() <= now.getTime() &&
    promotion.endsAt.getTime() > now.getTime()
  );
}

export function promotionAppliesToProduct(
  promotion: Pick<PromotionCandidate, "allProducts" | "productIds">,
  consultationId: number,
) {
  return (
    promotion.allProducts || promotion.productIds.includes(consultationId)
  );
}

export function selectBestPromotion(
  promotions: PromotionCandidate[],
  consultationId: number,
  now = new Date(),
) {
  return promotions
    .filter(
      (promotion) =>
        isPromotionCurrentlyActive(promotion, now) &&
        promotionAppliesToProduct(promotion, consultationId),
    )
    .sort(
      (left, right) =>
        right.percentOff - left.percentOff ||
        left.endsAt.getTime() - right.endsAt.getTime() ||
        left.id - right.id,
    )[0] ?? null;
}

export function formatPriceFromCents(priceCents: number) {
  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    style: "currency",
  }).format(priceCents / 100);
}
