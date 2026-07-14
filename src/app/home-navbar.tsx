import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/auth-options";
import HomeNavbarClient from "@/app/home-navbar-client";
import { getActivePublicPromotions, type PublicPromotion } from "@/lib/promotions";

type HomeNavbarProps = {
  promotion?: PublicPromotion | null;
};

function formatPromotionEndDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
  }).format(date);
}

export default async function HomeNavbar({ promotion }: HomeNavbarProps = {}) {
  const [session, fetchedPromotions] = await Promise.all([
    getServerSession(authOptions),
    promotion === undefined
      ? getActivePublicPromotions()
      : Promise.resolve(null),
  ]);
  const visiblePromotion =
    promotion === undefined ? (fetchedPromotions?.[0] ?? null) : promotion;
  const promotionMessage = visiblePromotion
    ? `${visiblePromotion.bannerText} · -${visiblePromotion.percentOff}% avec le code ${visiblePromotion.code} · jusqu'au ${formatPromotionEndDate(visiblePromotion.endsAt)}`
    : "";

  return (
    <>
      {visiblePromotion ? (
        <Link
          aria-label={promotionMessage}
          className="promotion-banner"
          href="/produits"
        >
          <span className="promotion-banner-track">
            <span>{promotionMessage}</span>
            <span aria-hidden="true">{promotionMessage}</span>
          </span>
        </Link>
      ) : null}
      <HomeNavbarClient
        hasPromotion={Boolean(visiblePromotion)}
        user={
          session?.user
            ? {
                image: session.user.image ?? null,
                isAdmin: Boolean(session.user.isAdmin),
                name: session.user.name ?? "Compte Discord",
              }
            : null
        }
      />
    </>
  );
}
