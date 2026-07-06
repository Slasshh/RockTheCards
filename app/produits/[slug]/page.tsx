import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createBooking } from "@/app/actions";
import HomeNavbar from "@/app/home-navbar";
import ProductBookingForm from "@/app/product-booking-form";
import { prisma } from "@/lib/prisma";

function toDateTimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDisabledWeekdays(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day));
}

function parseNumberList(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
}

function parseDisabledDaysByMonth(value: string | null) {
  return (value ?? "").split(",").reduce<Record<number, number[]>>(
    (accumulator, item) => {
      const [monthValue, dayValue] = item.split(":");
      const month = Number(monthValue);
      const day = Number(dayValue);

      if (Number.isInteger(month) && Number.isInteger(day)) {
        accumulator[month] = [...(accumulator[month] ?? []), day];
      }

      return accumulator;
    },
    {},
  );
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();

  const { slug } = await params;
  const consultation = await prisma.consultation.findUnique({
    where: { slug },
  });

  if (!consultation) {
    notFound();
  }

  const bookedSlots = (
    await prisma.booking.findMany({
      select: { preferredDate: true },
      where: { paymentStatus: "paid", preferredDate: { not: null } },
    })
  )
    .map((booking) => booking.preferredDate)
    .filter((date): date is Date => Boolean(date))
    .map(toDateTimeLocalValue);

  return (
    <main className="min-h-screen bg-[#F4F8FB] text-[#182B49]">
      <section className="product-detail-hero relative overflow-hidden px-5 pb-20 pt-28 text-[#F4F8FB] md:px-8 md:pb-24 md:pt-32 lg:px-10">
        <HomeNavbar />
        <span className="products-star product-detail-star-a" />
        <span className="products-star product-detail-star-b" />
        <span className="products-star product-detail-star-c" />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div>
            <Link className="product-detail-back" href="/produits">
              Retour aux produits
            </Link>
            <p className="mt-10 text-sm font-extrabold uppercase tracking-[0.28em] text-[#75C7E7]">
              {consultation.badge}
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[1.04] text-[#F4F8FB] md:text-7xl">
              {consultation.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-[#BCE8F5] md:text-lg">
              {consultation.summary}
            </p>

            <div className="product-detail-meta-grid mt-9">
              <div className="product-detail-meta-card">
                <span>Prix</span>
                <strong>{consultation.price} EUR</strong>
              </div>
              <div className="product-detail-meta-card">
                <span>Durée</span>
                <strong>
                  {consultation.duration
                    ? `${consultation.duration} min`
                    : "Sur message"}
                </strong>
              </div>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <a className="product-detail-primary-link" href="#details">
                Voir les détails
              </a>
            </div>
          </div>

          <div className="product-detail-hero-form">
            <ProductBookingForm
              allowSameDayBooking={consultation.allowSameDayBooking}
              allowedMonths={parseNumberList(consultation.allowedMonths)}
              bookable={consultation.bookable}
              bookedSlots={bookedSlots}
              bookingBufferMinutes={consultation.bookingBufferMinutes}
              bookingDaysAhead={consultation.bookingDaysAhead}
              consultationId={consultation.id}
              consultationImageUrl={consultation.imageUrl}
              consultationTitle={consultation.title}
              createBooking={createBooking}
              customerFields={(consultation.customerFields ?? "name,email")
                .split(",")
                .filter(Boolean)}
              disabledDaysByMonth={parseDisabledDaysByMonth(
                consultation.disabledDaysByMonth,
              )}
              disableFrenchHolidays={consultation.disableFrenchHolidays}
              disabledMonthDays={parseNumberList(consultation.disabledMonthDays)}
              disabledWeekdays={parseDisabledWeekdays(
                consultation.disabledWeekdays,
              )}
              slotDurationMinutes={consultation.slotDurationMinutes}
            />
          </div>
        </div>
      </section>

      <section
        className="product-detail-content px-5 py-16 md:px-8 md:py-20 lg:px-10"
        id="details"
      >
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <aside className="product-detail-preview product-detail-preview-light">
            <div
              className="product-detail-preview-image"
              style={{
                backgroundImage: `url(${consultation.imageUrl || "/card-spread.svg"})`,
              }}
            />
            <div className="product-detail-preview-footer">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#FFD35A]">
                  Aperçu
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#BCE8F5]">
                  Le visuel du tirage reste disponible dans les détails, sans
                  éloigner la réservation du premier écran.
                </p>
              </div>
              <span>{consultation.bookable ? "Créneau" : "Message"}</span>
            </div>
          </aside>

          <div className="grid gap-5">
            <article className="product-detail-info-card">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#75C7E7]">
                Confirmation
              </p>
              <h2 className="mt-3 text-2xl font-black text-[#182B49]">
                Ton créneau est bloqué après paiement.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-[#425D78]">
                Une fois la réservation validée, l&apos;horaire choisi devient
                indisponible pour les prochaines demandes. Tu gardes ainsi un
                moment réellement dédié à ta lecture.
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
