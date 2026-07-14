import Link from "next/link";
import { connection } from "next/server";
import type { CSSProperties } from "react";
import HomeNavbar from "@/app/home-navbar";
import { prisma } from "@/lib/prisma";
import { formatPriceFromCents } from "@/lib/promotion-pricing";

function formatDate(date: Date | null) {
  if (!date) {
    return "Consultation sans créneau";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

function getPaymentLabel(status: string) {
  if (status === "paid") {
    return "Paiement confirmé";
  }

  return "Paiement en vérification";
}

function getOrderLabel(status: string) {
  const labels: Record<string, string> = {
    cancelled: "Créneau à vérifier",
    confirmed: "Réservation confirmée",
    new: "Demande reçue",
  };

  return labels[status] ?? status;
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  await connection();

  const { session_id: sessionId } = await searchParams;
  const booking = sessionId
    ? await prisma.booking.findUnique({
        include: { consultation: true },
        where: { stripeSessionId: sessionId },
      })
    : null;

  return (
    <main className="payment-success-page min-h-screen overflow-hidden bg-[#182B49] text-[#F4F8FB]">
      <HomeNavbar />
      <div className="success-orbit" aria-hidden="true" />
      <div className="success-star success-star-a" aria-hidden="true" />
      <div className="success-star success-star-b" aria-hidden="true" />
      <div className="success-card success-card-a" aria-hidden="true" />
      <div className="success-card success-card-b" aria-hidden="true" />
      <div className="payment-success-spark payment-success-spark-a" aria-hidden="true" />
      <div className="payment-success-spark payment-success-spark-b" aria-hidden="true" />
      <div className="payment-success-spark payment-success-spark-c" aria-hidden="true" />

      <section className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-5 pb-16 pt-32 md:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-10">
        <div className="payment-success-hero">
          <div className="success-check grid size-24 place-items-center rounded-full border border-[#FFD35A] bg-[#FFD35A]/10">
            <span aria-hidden="true" className="payment-success-checkmark" />
          </div>
          <p className="mt-8 text-sm font-black uppercase tracking-[0.28em] text-[#FFD35A]">
            Paiement accepté
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[1.02] md:text-7xl">
            Réservation reçue.
          </h1>
          <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-[#BCE8F5] md:text-lg">
            Merci, ta demande est enregistrée. Le créneau est bloqué dès que la
            commande est confirmée côté paiement.
          </p>
          <div className="payment-success-actions mt-9 flex flex-wrap gap-3">
            <Link className="payment-success-primary" href="/produits">
              Voir les produits
            </Link>
            <Link className="payment-success-secondary" href="/">
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>

        <aside className="payment-success-panel">
          <div className="payment-success-panel-header">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#75C7E7]">
                Récapitulatif
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#182B49]">
                {booking?.consultation.title ?? "Commande validée"}
              </h2>
            </div>
          </div>

          <div className="payment-success-details">
            <div style={{ "--success-delay": "80ms" } as CSSProperties}>
              <span>Statut paiement</span>
              <strong>{getPaymentLabel(booking?.paymentStatus ?? "paid")}</strong>
            </div>
            <div style={{ "--success-delay": "160ms" } as CSSProperties}>
              <span>Commande</span>
              <strong>{getOrderLabel(booking?.orderStatus ?? "confirmed")}</strong>
            </div>
            <div style={{ "--success-delay": "240ms" } as CSSProperties}>
              <span>Moment</span>
              <strong>{formatDate(booking?.preferredDate ?? null)}</strong>
            </div>
            {booking ? (
              <div style={{ "--success-delay": "320ms" } as CSSProperties}>
                <span>Montant</span>
                <strong>
                  {booking.discountPercent ? (
                    <del className="mr-2 text-[#7A8C9D]">
                      {formatPriceFromCents(booking.originalPriceCents)}
                    </del>
                  ) : null}
                  {formatPriceFromCents(booking.paidAmountCents)}
                </strong>
              </div>
            ) : null}
            {booking?.promotionCode ? (
              <div style={{ "--success-delay": "400ms" } as CSSProperties}>
                <span>Code promotionnel</span>
                <strong>
                  {booking.promotionCode} (-{booking.discountPercent}%)
                </strong>
              </div>
            ) : null}
          </div>

          {booking?.message ? (
            <div className="payment-success-message">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#75C7E7]">
                Message transmis
              </p>
              <p className="mt-3 text-sm font-semibold leading-7 text-[#425D78]">
                {booking.message}
              </p>
            </div>
          ) : (
            <div className="payment-success-message">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#75C7E7]">
                Prochaine étape
              </p>
              <p className="mt-3 text-sm font-semibold leading-7 text-[#425D78]">
                Ta demande apparaît maintenant dans le suivi admin. Tu peux
                revenir aux produits ou à l&apos;accueil tranquillement.
              </p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
