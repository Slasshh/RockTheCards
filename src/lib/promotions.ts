import {
  isPromotionCurrentlyActive,
  isValidPromotionCode,
  normalizePromotionCode,
  promotionAppliesToProduct,
  type PromotionCandidate,
} from "@/lib/promotion-pricing";
import { prisma } from "@/lib/prisma";

export type PublicPromotion = PromotionCandidate & {
  bannerText: string;
  title: string;
};

function toPublicPromotion(promotion: {
  active: boolean;
  allProducts: boolean;
  bannerText: string;
  code: string;
  endsAt: Date;
  id: number;
  percentOff: number;
  products: Array<{ consultationId: number }>;
  startsAt: Date;
  title: string;
}): PublicPromotion {
  return {
    active: promotion.active,
    allProducts: promotion.allProducts,
    bannerText: promotion.bannerText,
    code: promotion.code,
    endsAt: promotion.endsAt,
    id: promotion.id,
    percentOff: promotion.percentOff,
    productIds: promotion.products.map((product) => product.consultationId),
    startsAt: promotion.startsAt,
    title: promotion.title,
  };
}

export async function getActivePublicPromotions(now = new Date()) {
  const promotions = await prisma.promotion.findMany({
    include: {
      products: {
        select: { consultationId: true },
      },
    },
    orderBy: [{ percentOff: "desc" }, { endsAt: "asc" }, { id: "asc" }],
    where: {
      active: true,
      endsAt: { gt: now },
      OR: [{ allProducts: true }, { products: { some: {} } }],
      startsAt: { lte: now },
    },
  });

  return promotions.map(toPublicPromotion);
}

export async function getApplicablePromotionByCode(
  rawCode: string,
  consultationId: number,
  now = new Date(),
) {
  const code = normalizePromotionCode(rawCode);

  if (!isValidPromotionCode(code)) {
    return null;
  }

  const promotion = await prisma.promotion.findUnique({
    include: {
      products: {
        select: { consultationId: true },
      },
    },
    where: { code },
  });

  if (!promotion) {
    return null;
  }

  const publicPromotion = toPublicPromotion(promotion);

  if (
    !isPromotionCurrentlyActive(publicPromotion, now) ||
    !promotionAppliesToProduct(publicPromotion, consultationId)
  ) {
    return null;
  }

  return publicPromotion;
}
