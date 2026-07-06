import Link from "next/link";
import { connection } from "next/server";
import type { CSSProperties } from "react";
import HomeNavbar from "@/app/home-navbar";
import { formatProductBadge } from "@/lib/product-labels";
import { prisma } from "@/lib/prisma";

export default async function ProduitsPage() {
  await connection();

  const consultations = await prisma.consultation.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <main className="min-h-screen bg-[#F4F8FB] text-[#182B49]">
      <section className="products-hero relative overflow-hidden bg-[#182B49] px-5 pb-20 pt-28 text-[#F4F8FB] md:px-8 md:pt-32 lg:px-10">
        <HomeNavbar />
        <div className="products-star products-star-a" aria-hidden="true" />
        <div className="products-star products-star-b" aria-hidden="true" />
        <div className="products-star products-star-c" aria-hidden="true" />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#FFD35A]">
              Consultations
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.02] text-balance md:text-7xl">
              Choisis le tirage qui parle à ton moment.
            </h1>
          </div>
          <div className="max-w-2xl lg:justify-self-end">
            <p className="text-lg leading-8 text-[#BCE8F5]">
              Chaque guidance précise son intention, sa durée et ce qu&apos;elle
              peut t&apos;apporter. Ouvre une fiche pour poser ton message et
              réserver un créneau disponible.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="products-hero-pill">
                <span>{consultations.length}</span>
                Tirages
              </div>
              <div className="products-hero-pill">
                <span>En ligne</span>
                Réservation
              </div>
              <div className="products-hero-pill">
                <span>Soin</span>
                Lecture préparée
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="products-list-section px-5 py-16 md:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#425D78]">
                Sélection
              </p>
              <h2 className="mt-3 text-4xl font-semibold md:text-5xl">
                Les guidances disponibles
              </h2>
            </div>
            <p className="max-w-xl leading-7 text-[#425D78]">
              Compare l&apos;énergie, le format et le prix, puis entre dans la
              fiche qui correspond à ta question.
            </p>
          </div>

          {consultations.length > 0 ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {consultations.map((consultation, index) => (
                <Link
                  className="products-card group"
                  href={`/produits/${consultation.slug}`}
                  key={consultation.id}
                  style={{ "--product-delay": `${index * 80}ms` } as CSSProperties}
                >
                  <div className="products-card-media">
                    <div
                      className="products-card-image"
                      style={{
                        backgroundImage: `url(${consultation.imageUrl || "/card-spread.svg"})`,
                      }}
                    />
                    <span className="products-card-badge">
                      {formatProductBadge(consultation.badge)}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[#425D78]">
                      <span>
                        {consultation.duration
                          ? `${consultation.duration} min`
                          : "Guidance"}
                      </span>
                      <span>{consultation.price} EUR</span>
                    </div>
                    <h3 className="mt-6 text-2xl font-semibold leading-tight text-[#182B49]">
                      {consultation.title}
                    </h3>
                    <p className="mt-4 flex-1 text-sm leading-6 text-[#425D78]">
                      {consultation.summary}
                    </p>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-3xl font-bold text-[#182B49]">
                        {consultation.price}€
                      </span>
                      <span className="products-card-action">
                        Ouvrir
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="products-empty mt-10">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#FFD35A]">
                Bientôt
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                Les consultations arrivent.
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-[#BCE8F5]">
                Aucun produit n&apos;est encore publié. Repasse un peu plus tard
                pour découvrir les nouveaux tirages.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
