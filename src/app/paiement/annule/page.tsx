import Link from "next/link";
import type { CSSProperties } from "react";
import HomeNavbar from "@/app/home-navbar";

const cancelDetails = [
  { label: "Paiement", value: "Aucun débit" },
  { label: "Réservation", value: "En pause" },
  { label: "Créneau", value: "Encore disponible" },
  { label: "Suite", value: "Reprendre tranquillement" },
] as const;

export default function PaymentCancelPage() {
  return (
    <main className="payment-success-page payment-cancel-page min-h-screen overflow-hidden bg-[#F4F8FB] text-[#182B49]">
      <HomeNavbar />
      <div className="success-orbit cancel-orbit" aria-hidden="true" />
      <div className="success-star success-star-a payment-cancel-star" aria-hidden="true" />
      <div className="success-star success-star-b payment-cancel-star" aria-hidden="true" />
      <div className="success-card success-card-a cancel-card" aria-hidden="true" />
      <div className="success-card success-card-b cancel-card" aria-hidden="true" />

      <section className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-5 pb-16 pt-32 md:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-10">
        <div className="payment-success-hero">
          <div className="cancel-mark payment-cancel-status grid size-24 place-items-center rounded-full">
            <span aria-hidden="true" className="payment-cancel-pause" />
          </div>
          <p className="mt-8 text-sm font-black uppercase tracking-[0.24em] text-[#75C7E7]">
            Paiement non finalisé
          </p>
          <h1 className="payment-cancel-heading mt-4 max-w-3xl font-black leading-[1.04]">
            Ta réservation est simplement en pause.
          </h1>
          <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-[#425D78] md:text-lg">
            Aucun paiement n&apos;a été encaissé. Tu peux revenir aux produits,
            choisir ton créneau et valider plus tard sans pression.
          </p>
          <div className="payment-success-actions mt-9 flex flex-wrap gap-3">
            <Link className="payment-success-primary" href="/produits">
              Reprendre doucement
            </Link>
            <Link className="payment-success-secondary" href="/">
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>

        <aside className="payment-success-panel payment-cancel-panel">
          <div className="payment-success-panel-header">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#75C7E7]">
                Où ça en est
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#182B49]">
                Rien n&apos;est perdu
              </h2>
            </div>
          </div>

          <div className="payment-success-details">
            {cancelDetails.map((detail, index) => (
              <div
                key={detail.label}
                style={{ "--success-delay": `${80 * (index + 1)}ms` } as CSSProperties}
              >
                <span>{detail.label}</span>
                <strong>{detail.value}</strong>
              </div>
            ))}
          </div>

          <div className="payment-success-message payment-cancel-message">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#75C7E7]">
              À retenir
            </p>
            <p className="mt-3 text-sm font-semibold leading-7 text-[#425D78]">
              La commande sera créée seulement après validation du paiement. Pour
              l&apos;instant, tu peux juste reprendre le parcours quand tu veux.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
