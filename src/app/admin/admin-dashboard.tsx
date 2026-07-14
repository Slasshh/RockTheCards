"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatProductBadge } from "@/lib/product-labels";
import { formatPriceFromCents } from "@/lib/promotion-pricing";

type AdminProduct = {
  allowSameDayBooking: boolean;
  badge: string;
  bookable: boolean;
  bookings: Array<{
    createdAt: string;
    preferredDate: string | null;
  }>;
  createdAt: string;
  customerFields: string | null;
  duration: number | null;
  featured: boolean;
  focus: string;
  id: number;
  imageUrl: string | null;
  price: number;
  bookingBufferMinutes: number;
  bookingDaysAhead: number;
  slotDurationMinutes: number;
  allowedMonths: string | null;
  disabledDaysByMonth: string | null;
  disableFrenchHolidays: boolean;
  disabledMonthDays: string | null;
  disabledWeekdays: string | null;
  slug: string;
  sortOrder: number;
  summary: string;
  title: string;
  unavailableText: string | null;
  _count: {
    bookings: number;
  };
};

type ProductFormValues = Omit<AdminProduct, "bookings" | "createdAt" | "_count">;

type AdminPromotion = {
  _count: { bookings: number };
  active: boolean;
  allProducts: boolean;
  bannerText: string;
  code: string;
  createdAt: string;
  endsAt: string;
  id: number;
  percentOff: number;
  productIds: number[];
  startsAt: string;
  title: string;
  updatedAt: string;
};

type PromotionFormValues = Omit<
  AdminPromotion,
  "_count" | "createdAt" | "updatedAt"
>;

type AdminDashboardProps = {
  createPromotion: (formData: FormData) => Promise<void>;
  createProduct: (formData: FormData) => Promise<void>;
  deletePromotion: (formData: FormData) => Promise<void>;
  deleteProduct: (formData: FormData) => Promise<void>;
  disconnectGoogleCalendar: () => Promise<void>;
  googleCalendarNotice: GoogleCalendarNotice;
  googleCalendarStatus: GoogleCalendarStatus;
  initialView: AdminView;
  orders: AdminOrder[];
  products: AdminProduct[];
  promotions: AdminPromotion[];
  updateOrderStatus: (formData: FormData) => Promise<void>;
  updatePromotion: (formData: FormData) => Promise<void>;
  updateProduct: (formData: FormData) => Promise<void>;
  updateProductDatePicker: (formData: FormData) => Promise<void>;
  userLabel: string;
};

type AdminOrder = {
  consultation: {
    title: string;
  };
  consultationId: number;
  createdAt: string;
  email: string | null;
  firstName: string | null;
  id: number;
  message: string | null;
  name: string | null;
  phone: string | null;
  orderStatus: string;
  paymentStatus: string;
  paidAmountCents: number;
  preferredDate: string | null;
  promotionCode: string | null;
  discountPercent: number | null;
  originalPriceCents: number;
  stripeSessionId: string | null;
};

type GoogleCalendarNotice =
  | "connected"
  | "disconnected"
  | "error"
  | "scope"
  | null;

type GoogleCalendarStatus = {
  configurationReady: boolean;
  connected: boolean;
  email: string | null;
  needsReconnect: boolean;
  redirectUri: string | null;
  updatedAt: string | null;
};

type AdminView =
  | "products"
  | "promotions"
  | "datePicker"
  | "orders"
  | "stats"
  | "calendar";

const adminViews: Array<{
  description: string;
  id: AdminView;
  label: string;
}> = [
  {
    description: "Catalogue, prix et fiches publiques",
    id: "products",
    label: "Produits",
  },
  {
    description: "Codes, réductions et bandeau public",
    id: "promotions",
    label: "Promotions",
  },
  {
    description: "Créneaux, fermetures et calendrier",
    id: "datePicker",
    label: "Date picker",
  },
  {
    description: "Paiements, messages et statuts",
    id: "orders",
    label: "Commandes",
  },
  {
    description: "Chiffres, périodes et graphiques",
    id: "stats",
    label: "Stats",
  },
  {
    description: "Compte connecté et synchronisation",
    id: "calendar",
    label: "Google Agenda",
  },
];

const emptyProduct: ProductFormValues = {
  allowSameDayBooking: true,
  badge: "Nouveau",
  bookable: true,
  customerFields: "name,email",
  duration: null,
  featured: false,
  focus: "",
  id: 0,
  imageUrl: "",
  price: 50,
  bookingBufferMinutes: 0,
  bookingDaysAhead: 14,
  slotDurationMinutes: 60,
  allowedMonths: "",
  disabledDaysByMonth: "",
  disableFrenchHolidays: false,
  disabledMonthDays: "",
  disabledWeekdays: "",
  slug: "",
  sortOrder: 0,
  summary: "",
  title: "",
  unavailableText: "",
};

export default function AdminDashboard({
  createPromotion,
  createProduct,
  deletePromotion,
  deleteProduct,
  disconnectGoogleCalendar,
  googleCalendarNotice,
  googleCalendarStatus,
  initialView,
  orders,
  products,
  promotions,
  updateOrderStatus,
  updatePromotion,
  updateProduct,
  updateProductDatePicker,
  userLabel,
}: AdminDashboardProps) {
  const [activeView, setActiveView] = useState<AdminView>(initialView);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductFormValues | null>(null);
  const [selectedPromotion, setSelectedPromotion] =
    useState<PromotionFormValues | null>(null);
  const paidRevenue = orders.reduce(
    (sum, order) =>
      order.paymentStatus === "paid" ? sum + order.paidAmountCents : sum,
    0,
  );
  const newOrders = orders.filter((order) => order.orderStatus === "new").length;
  const totalBookings = products.reduce(
    (sum, product) => sum + product._count.bookings,
    0,
  );

  return (
    <main className="admin-shell min-h-screen text-[#182B49] lg:grid lg:grid-cols-[310px_1fr]">
      <aside className="admin-sidebar px-5 py-5 text-[#F4F8FB] lg:min-h-screen lg:px-6">
        <div className="admin-sidebar-star admin-sidebar-star-a" aria-hidden="true" />
        <div className="admin-sidebar-star admin-sidebar-star-b" aria-hidden="true" />
        <Link className="admin-brand" href="/">
          <Image
            alt="Logo RockTheCards"
            className="size-12 rounded-full"
            height={48}
            src="/logo.png"
            width={48}
          />
          <span>
            RockTheCards
            <small>Panel admin</small>
          </span>
        </Link>

        <div className="admin-user-card">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#FFD35A]">
            Connecté
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-[#F4F8FB]">
            {userLabel}
          </p>
        </div>

        <nav className="admin-nav">
          {adminViews.map((view) => (
            <button
              className={`admin-nav-button ${
                activeView === view.id ? "admin-nav-button-active" : ""
              }`}
              key={view.id}
              onClick={() => setActiveView(view.id)}
              type="button"
            >
              <span>{view.label}</span>
              <small>{view.description}</small>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-links">
          <Link href="/produits">Voir la boutique</Link>
          <Link href="/">Retour accueil</Link>
          <Link href="/api/auth/signout">Déconnexion</Link>
        </div>
      </aside>

      <section className="admin-content px-5 py-6 md:px-8 lg:px-10">
        <div className="admin-topbar">
          <div>
            <p className="admin-eyebrow">Administration</p>
            <h1>Gérer la boutique</h1>
          </div>
          <div className="admin-topbar-actions">
            <Link href="/produits">Boutique</Link>
            <Link href="/">Accueil</Link>
          </div>
        </div>

        <div className="admin-kpis">
          <article>
            <span>Produits</span>
            <strong>{products.length}</strong>
          </article>
          <article>
            <span>Réservations</span>
            <strong>{totalBookings}</strong>
          </article>
          <article>
            <span>Nouvelles</span>
            <strong>{newOrders}</strong>
          </article>
          <article>
            <span>CA payé</span>
            <strong>{formatPriceFromCents(paidRevenue)}</strong>
          </article>
        </div>

        <div className="admin-view-surface">
          {activeView === "products" ? (
            <ProductsPanel
              createProduct={createProduct}
              deleteProduct={deleteProduct}
              products={products}
              selectedProduct={selectedProduct}
              setSelectedProduct={setSelectedProduct}
              updateProduct={updateProduct}
            />
          ) : null}

          {activeView === "promotions" ? (
            <PromotionsPanel
              createPromotion={createPromotion}
              deletePromotion={deletePromotion}
              products={products}
              promotions={promotions}
              selectedPromotion={selectedPromotion}
              setSelectedPromotion={setSelectedPromotion}
              updatePromotion={updatePromotion}
            />
          ) : null}

          {activeView === "datePicker" ? (
            <DatePickerPanel
              products={products}
              updateProductDatePicker={updateProductDatePicker}
            />
          ) : null}

          {activeView === "orders" ? (
            <OrdersPanel orders={orders} updateOrderStatus={updateOrderStatus} />
          ) : null}

          {activeView === "stats" ? (
            <StatsPanel orders={orders} products={products} />
          ) : null}

          {activeView === "calendar" ? (
            <GoogleCalendarPanel
              disconnectGoogleCalendar={disconnectGoogleCalendar}
              notice={googleCalendarNotice}
              status={googleCalendarStatus}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function GoogleCalendarPanel({
  disconnectGoogleCalendar,
  notice,
  status,
}: {
  disconnectGoogleCalendar: () => Promise<void>;
  notice: GoogleCalendarNotice;
  status: GoogleCalendarStatus;
}) {
  const connectionLabel = status.connected
    ? "Connecté"
    : status.needsReconnect
      ? "Reconnexion requise"
      : "Non connecté";
  const noticeContent =
    notice === "connected"
      ? {
          className: "border-[#2C7A5A] bg-[#E8F6EF] text-[#155D43]",
          text: "Google Agenda est connecté.",
        }
      : notice === "disconnected"
        ? {
            className: "border-[#75C7E7] bg-[#EEF8FC] text-[#182B49]",
            text: "Google Agenda est déconnecté.",
          }
        : notice === "scope"
          ? {
              className: "border-[#C24D4D] bg-[#FFF1F1] text-[#8A2828]",
              text: "L'accès aux événements Google Agenda doit être autorisé.",
            }
        : notice === "error"
          ? {
              className: "border-[#C24D4D] bg-[#FFF1F1] text-[#8A2828]",
              text: "La connexion Google a échoué.",
            }
          : null;

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
            Intégration
          </p>
          <h1 className="mt-3 text-4xl font-semibold md:text-6xl">
            Google Agenda
          </h1>
        </div>
        <p className="text-sm font-bold text-[#182B49]">{connectionLabel}</p>
      </div>

      {noticeContent ? (
        <p
          aria-live="polite"
          className={`mt-6 border px-4 py-3 text-sm font-semibold ${noticeContent.className}`}
        >
          {noticeContent.text}
        </p>
      ) : null}

      <div className="mt-8 grid border-y border-[#75C7E7] md:grid-cols-3 md:divide-x md:divide-[#75C7E7]">
        <div className="py-5 md:pr-6">
          <span className="text-xs font-bold uppercase text-[#48627F]">
            Compte Google
          </span>
          <strong className="mt-2 block break-all text-base text-[#182B49]">
            {status.email ?? "Aucun compte"}
          </strong>
        </div>
        <div className="border-t border-[#75C7E7] py-5 md:border-t-0 md:px-6">
          <span className="text-xs font-bold uppercase text-[#48627F]">
            Agenda cible
          </span>
          <strong className="mt-2 block text-base text-[#182B49]">
            Agenda principal
          </strong>
        </div>
        <div className="border-t border-[#75C7E7] py-5 md:border-t-0 md:pl-6">
          <span className="text-xs font-bold uppercase text-[#48627F]">
            Dernière connexion
          </span>
          <strong className="mt-2 block text-base text-[#182B49]">
            {status.updatedAt
              ? new Date(status.updatedAt).toLocaleString("fr-FR")
              : "Jamais"}
          </strong>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-xs font-bold uppercase text-[#48627F]">
          URI de redirection OAuth
        </p>
        <code className="mt-2 block break-all border-l-4 border-[#FFD35A] bg-[#EEF8FC] px-4 py-3 text-sm text-[#182B49]">
          {status.redirectUri ?? "NEXTAUTH_URL non configurée"}
        </code>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {status.configurationReady ? (
          <Link
            className="rounded-md bg-[#182B49] px-5 py-3 text-sm font-bold text-[#F4F8FB] transition hover:bg-[#29496F]"
            href="/api/admin/google-calendar/connect"
            prefetch={false}
          >
            {status.connected || status.needsReconnect
              ? "Reconnecter Google Agenda"
              : "Connecter Google Agenda"}
          </Link>
        ) : (
          <button
            className="cursor-not-allowed rounded-md bg-[#D8E1EA] px-5 py-3 text-sm font-bold text-[#60748A]"
            disabled
            type="button"
          >
            Configuration OAuth manquante
          </button>
        )}

        {status.connected || status.needsReconnect ? (
          <form action={disconnectGoogleCalendar}>
            <button
              className="rounded-md border border-[#C24D4D] px-5 py-3 text-sm font-bold text-[#8A2828] transition hover:bg-[#FFF1F1]"
              type="submit"
            >
              Déconnecter
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

type PromotionsPanelProps = {
  createPromotion: (formData: FormData) => Promise<void>;
  deletePromotion: (formData: FormData) => Promise<void>;
  products: AdminProduct[];
  promotions: AdminPromotion[];
  selectedPromotion: PromotionFormValues | null;
  setSelectedPromotion: (promotion: PromotionFormValues | null) => void;
  updatePromotion: (formData: FormData) => Promise<void>;
};

function toDateTimeLocalValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoDateTimeValue(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function createEmptyPromotion(): PromotionFormValues {
  const startsAt = new Date();
  startsAt.setSeconds(0, 0);
  startsAt.setMinutes(Math.ceil(startsAt.getMinutes() / 15) * 15);
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + 7);

  return {
    active: true,
    allProducts: true,
    bannerText: "Offre limitée sur les guidances sélectionnées",
    code: "",
    endsAt: endsAt.toISOString(),
    id: 0,
    percentOff: 15,
    productIds: [],
    startsAt: startsAt.toISOString(),
    title: "Offre spéciale",
  };
}

function getPromotionStatus(promotion: AdminPromotion) {
  const now = Date.now();

  if (!promotion.active) {
    return {
      className: "bg-[#E7EDF3] text-[#425D78]",
      label: "En pause",
    };
  }

  if (new Date(promotion.startsAt).getTime() > now) {
    return {
      className: "bg-[#FFF4CF] text-[#7A5A00]",
      label: "Planifiée",
    };
  }

  if (new Date(promotion.endsAt).getTime() <= now) {
    return {
      className: "bg-[#FBE9E9] text-[#8A2828]",
      label: "Terminée",
    };
  }

  return {
    className: "bg-[#E1F4EA] text-[#155D43]",
    label: "En ligne",
  };
}

function formatPromotionDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function PromotionsPanel({
  createPromotion,
  deletePromotion,
  products,
  promotions,
  selectedPromotion,
  setSelectedPromotion,
  updatePromotion,
}: PromotionsPanelProps) {
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
            Promotions
          </p>
          <h1 className="mt-3 text-4xl font-semibold md:text-6xl">
            Codes et offres
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#425D78]">
            Programme une réduction, choisis les produits et publie le texte du
            bandeau affiché au-dessus du site.
          </p>
        </div>
        <button
          className="min-h-12 rounded-full bg-[#182B49] px-6 text-sm font-bold text-[#F4F8FB] transition hover:bg-[#29496F]"
          onClick={() => setSelectedPromotion(createEmptyPromotion())}
          type="button"
        >
          Nouvelle promotion
        </button>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="grid content-start gap-4">
          {promotions.map((promotion) => {
            const status = getPromotionStatus(promotion);

            return (
              <button
                className={`rounded-lg border p-5 text-left shadow-sm transition ${
                  selectedPromotion?.id === promotion.id
                    ? "border-[#182B49] bg-[#BCE8F5]"
                    : "border-[#75C7E7] bg-[#F4F8FB] hover:border-[#182B49]"
                }`}
                key={promotion.id}
                onClick={() =>
                  setSelectedPromotion({
                    active: promotion.active,
                    allProducts: promotion.allProducts,
                    bannerText: promotion.bannerText,
                    code: promotion.code,
                    endsAt: promotion.endsAt,
                    id: promotion.id,
                    percentOff: promotion.percentOff,
                    productIds: promotion.productIds,
                    startsAt: promotion.startsAt,
                    title: promotion.title,
                  })
                }
                type="button"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-[#182B49] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#FFD35A]">
                    {promotion.code}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{promotion.title}</h2>
                    <p className="mt-2 text-sm font-semibold text-[#425D78]">
                      Jusqu&apos;au {formatPromotionDate(promotion.endsAt)}
                    </p>
                  </div>
                  <strong className="text-3xl text-[#182B49]">
                    -{promotion.percentOff}%
                  </strong>
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#425D78]">
                  {promotion.allProducts
                    ? "Tous les produits"
                    : `${promotion.productIds.length} produit${
                        promotion.productIds.length > 1 ? "s" : ""
                      }`} · {promotion._count.bookings} utilisation
                  {promotion._count.bookings > 1 ? "s" : ""}
                </p>
              </button>
            );
          })}

          {promotions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#75C7E7] bg-[#F4F8FB] p-6 text-sm font-semibold leading-6 text-[#425D78]">
              Aucune promotion pour le moment. Crée la première offre depuis le
              bouton ci-dessus.
            </div>
          ) : null}
        </div>

        <div className="min-h-[560px] rounded-lg border border-[#75C7E7] bg-[#F4F8FB] p-5 shadow-sm">
          {selectedPromotion ? (
            <PromotionForm
              action={
                selectedPromotion.id ? updatePromotion : createPromotion
              }
              deletePromotion={deletePromotion}
              key={selectedPromotion.id || "new-promotion"}
              products={products}
              promotion={selectedPromotion}
              setSelectedPromotion={setSelectedPromotion}
            />
          ) : (
            <div className="grid min-h-[510px] place-items-center text-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
                  Programmation
                </p>
                <h2 className="mt-3 text-3xl font-semibold">
                  Choisis une promotion
                </h2>
                <p className="mt-3 max-w-md leading-7 text-[#425D78]">
                  Modifie une offre existante ou prépare un nouveau code avec
                  ses dates de publication.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PromotionForm({
  action,
  deletePromotion,
  products,
  promotion,
  setSelectedPromotion,
}: {
  action: (formData: FormData) => Promise<void>;
  deletePromotion: (formData: FormData) => Promise<void>;
  products: AdminProduct[];
  promotion: PromotionFormValues;
  setSelectedPromotion: (promotion: PromotionFormValues | null) => void;
}) {
  const isEditing = Boolean(promotion.id);
  const [allProducts, setAllProducts] = useState(promotion.allProducts);
  const [startsAt, setStartsAt] = useState(
    toDateTimeLocalValue(promotion.startsAt),
  );
  const [endsAt, setEndsAt] = useState(
    toDateTimeLocalValue(promotion.endsAt),
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
            {isEditing ? "Modifier" : "Création"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold">
            {isEditing ? promotion.title : "Nouvelle promotion"}
          </h2>
        </div>
        <button
          className="rounded-full border border-[#75C7E7] px-4 py-2 text-sm font-bold text-[#182B49] transition hover:border-[#182B49]"
          onClick={() => setSelectedPromotion(null)}
          type="button"
        >
          Fermer
        </button>
      </div>

      <form action={action} className="mt-6 grid gap-4 md:grid-cols-2">
        {isEditing ? <input name="id" type="hidden" value={promotion.id} /> : null}
        <input name="startsAt" type="hidden" value={toIsoDateTimeValue(startsAt)} />
        <input name="endsAt" type="hidden" value={toIsoDateTimeValue(endsAt)} />

        <label className="grid gap-2 text-sm font-semibold">
          Code promotionnel
          <input
            className="min-h-12 rounded-md border border-[#75C7E7] bg-white px-4 font-black uppercase outline-none transition focus:border-[#182B49]"
            defaultValue={promotion.code}
            maxLength={32}
            name="code"
            pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,31}"
            placeholder="ETE20"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Réduction
          <span className="relative">
            <input
              className="min-h-12 w-full rounded-md border border-[#75C7E7] bg-white px-4 pr-10 font-normal outline-none transition focus:border-[#182B49]"
              defaultValue={promotion.percentOff}
              max="90"
              min="1"
              name="percentOff"
              required
              type="number"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-black text-[#425D78]">
              %
            </span>
          </span>
        </label>
        <label className="grid gap-2 text-sm font-semibold md:col-span-2">
          Nom interne
          <input
            className="min-h-12 rounded-md border border-[#75C7E7] bg-white px-4 font-normal outline-none transition focus:border-[#182B49]"
            defaultValue={promotion.title}
            maxLength={120}
            name="title"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold md:col-span-2">
          Texte du bandeau public
          <textarea
            className="min-h-24 rounded-md border border-[#75C7E7] bg-white px-4 py-3 font-normal leading-6 outline-none transition focus:border-[#182B49]"
            defaultValue={promotion.bannerText}
            maxLength={191}
            name="bannerText"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Début
          <input
            className="min-h-12 rounded-md border border-[#75C7E7] bg-white px-4 font-normal outline-none transition focus:border-[#182B49]"
            onChange={(event) => setStartsAt(event.target.value)}
            required
            type="datetime-local"
            value={startsAt}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Fin
          <input
            className="min-h-12 rounded-md border border-[#75C7E7] bg-white px-4 font-normal outline-none transition focus:border-[#182B49]"
            min={startsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            required
            type="datetime-local"
            value={endsAt}
          />
        </label>

        <label className="flex min-h-12 items-center justify-between gap-4 rounded-md border border-[#75C7E7] bg-[#EAF7FC] px-4 text-sm font-semibold md:col-span-2">
          <span>
            Promotion active
            <small className="mt-1 block font-normal text-[#425D78]">
              Le bandeau et la réduction respectent aussi les dates ci-dessus.
            </small>
          </span>
          <input
            className="size-5 accent-[#182B49]"
            defaultChecked={promotion.active}
            name="active"
            type="checkbox"
          />
        </label>

        <fieldset className="grid gap-3 rounded-md border border-[#75C7E7] bg-[#EAF7FC] p-4 md:col-span-2">
          <legend className="px-2 text-sm font-semibold">Produits concernés</legend>
          <label className="flex items-center gap-3 text-sm font-bold">
            <input
              checked={allProducts}
              className="size-5 accent-[#182B49]"
              name="allProducts"
              onChange={(event) => setAllProducts(event.target.checked)}
              type="checkbox"
            />
            Tous les produits
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {products.map((product) => (
              <label
                className={`flex items-center gap-3 rounded-md border px-3 py-3 text-sm font-semibold ${
                  allProducts
                    ? "border-[#D7E4EC] bg-[#F4F8FB] text-[#7A8C9D]"
                    : "border-[#75C7E7] bg-white text-[#182B49]"
                }`}
                key={product.id}
              >
                <input
                  className="size-4 accent-[#182B49]"
                  defaultChecked={promotion.productIds.includes(product.id)}
                  disabled={allProducts}
                  name="productIds"
                  type="checkbox"
                  value={product.id}
                />
                <span className="min-w-0 truncate">{product.title}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          className="min-h-12 rounded-full bg-[#182B49] px-5 text-sm font-bold text-white transition hover:bg-[#29496F] md:col-span-2"
          type="submit"
        >
          {isEditing ? "Enregistrer la promotion" : "Créer la promotion"}
        </button>
      </form>

      {isEditing ? (
        <form action={deletePromotion} className="mt-3">
          <input name="id" type="hidden" value={promotion.id} />
          <button
            className="min-h-11 w-full rounded-full border border-[#C24D4D] px-5 text-sm font-bold text-[#8A2828] transition hover:bg-[#FFF1F1]"
            type="submit"
          >
            Supprimer la promotion
          </button>
        </form>
      ) : null}
    </div>
  );
}

type ProductsPanelProps = {
  createProduct: (formData: FormData) => Promise<void>;
  deleteProduct: (formData: FormData) => Promise<void>;
  products: AdminProduct[];
  selectedProduct: ProductFormValues | null;
  setSelectedProduct: (product: ProductFormValues | null) => void;
  updateProduct: (formData: FormData) => Promise<void>;
};

function ProductsPanel({
  createProduct,
  deleteProduct,
  products,
  selectedProduct,
  setSelectedProduct,
  updateProduct,
}: ProductsPanelProps) {
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
            Produits
          </p>
          <h1 className="mt-3 text-4xl font-semibold md:text-6xl">
            Catalogue admin
          </h1>
        </div>
        <button
          className="min-h-12 rounded-full bg-[#182B49] px-6 text-sm font-bold text-[#F4F8FB] transition hover:bg-[#182B49]"
          onClick={() => setSelectedProduct(emptyProduct)}
          type="button"
        >
          Nouveau produit
        </button>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4">
          {products.map((product) => (
            <button
              className={`rounded-lg border p-5 text-left shadow-sm transition ${
                selectedProduct?.id === product.id
                  ? "border-[#182B49] bg-[#BCE8F5]"
                  : "border-[#75C7E7] bg-[#F4F8FB] hover:border-[#182B49]"
              }`}
              key={product.id}
              onClick={() =>
                setSelectedProduct({
                  badge: product.badge,
                  allowSameDayBooking: product.allowSameDayBooking,
                  bookable: product.bookable,
                  customerFields: product.customerFields ?? "name,email",
                  duration: product.duration,
                  featured: product.featured,
                  focus: product.focus,
                  id: product.id,
                  imageUrl: product.imageUrl ?? "",
                  price: product.price,
                  bookingBufferMinutes: product.bookingBufferMinutes,
                  bookingDaysAhead: product.bookingDaysAhead,
                  slotDurationMinutes: product.slotDurationMinutes,
                  allowedMonths: product.allowedMonths ?? "",
                  disabledDaysByMonth: product.disabledDaysByMonth ?? "",
                  disableFrenchHolidays: product.disableFrenchHolidays,
                  disabledMonthDays: product.disabledMonthDays ?? "",
                  disabledWeekdays: product.disabledWeekdays ?? "",
                  slug: product.slug,
                  sortOrder: product.sortOrder,
                  summary: product.summary,
                  title: product.title,
                  unavailableText: product.unavailableText ?? "",
                })
              }
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-[#182B49] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#FFD35A]">
                  {formatProductBadge(product.badge)}
                </span>
                <span className="text-sm font-semibold text-[#182B49]">
                  {product._count.bookings} réservations
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-semibold">{product.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#182B49]">
                {product.summary}
              </p>
              <p className="mt-4 text-sm font-semibold text-[#182B49]">
                {product.price} EUR
                {product.duration ? ` - ${product.duration} min` : ""}
              </p>
              {!product.bookable ? (
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-[#182B49]">
                  Non réservable
                </p>
              ) : null}
            </button>
          ))}
        </div>

        <div className="min-h-[520px] rounded-lg border border-[#75C7E7] bg-[#F4F8FB] p-5 shadow-sm">
          {selectedProduct ? (
            <ProductForm
              action={selectedProduct.id ? updateProduct : createProduct}
              deleteProduct={deleteProduct}
              key={selectedProduct.id || "new"}
              product={selectedProduct}
              setSelectedProduct={setSelectedProduct}
            />
          ) : (
            <div className="grid min-h-[470px] place-items-center text-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
                  Formulaire
                </p>
                <h2 className="mt-3 text-3xl font-semibold">
                  Clique sur un produit
                </h2>
                <p className="mt-3 max-w-md leading-7 text-[#182B49]">
                  Le formulaire s&apos;ouvre ici, au centre du panel, pour
                  modifier ou créer une fiche produit.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ProductFormProps = {
  action: (formData: FormData) => Promise<void>;
  deleteProduct: (formData: FormData) => Promise<void>;
  product: ProductFormValues;
  setSelectedProduct: (product: ProductFormValues | null) => void;
};

function ProductForm({
  action,
  deleteProduct,
  product,
  setSelectedProduct,
}: ProductFormProps) {
  const isEditing = Boolean(product.id);
  const [isBookable, setIsBookable] = useState(product.bookable);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
            {isEditing ? "Modifier" : "Création"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold">
            {isEditing ? product.title : "Nouveau produit"}
          </h2>
        </div>
        <button
          className="rounded-full border border-[#75C7E7] px-4 py-2 text-sm font-bold text-[#182B49] transition hover:border-[#182B49]"
          onClick={() => setSelectedProduct(null)}
          type="button"
        >
          Fermer
        </button>
      </div>

      <form action={action} className="mt-5 grid gap-4 md:grid-cols-2">
        {isEditing ? <input name="id" type="hidden" value={product.id} /> : null}
        <label className="grid gap-2 text-sm font-semibold">
          Titre
          <input
            className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
            defaultValue={product.title}
            name="title"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Slug
          <input
            className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
            defaultValue={product.slug}
            name="slug"
            placeholder="auto si vide"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Prix
          <input
            className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
            defaultValue={product.price}
            min="1"
            name="price"
            required
            type="number"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Durée en minutes
          <input
            className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
            defaultValue={product.duration ?? ""}
            min="1"
            name="duration"
            type="number"
            placeholder="Vide si pas de durée"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold md:col-span-2">
          Image produit
          <input
            className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
            defaultValue={product.imageUrl ?? ""}
            name="imageUrl"
            placeholder="/img/mon-produit.png, /logo.png ou https://..."
          />
        </label>
        <div className="grid gap-2 text-sm font-semibold md:col-span-2">
          Type de produit
          <select
            className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
            onChange={(event) => setIsBookable(event.target.value === "yes")}
            value={isBookable ? "yes" : "no"}
          >
            <option value="yes">Réservable avec date picker</option>
            <option value="no">Non réservable avec message</option>
          </select>
          <input name="bookable" type="hidden" value={isBookable ? "on" : ""} />
        </div>
        {isBookable ? (
          <div className="rounded-md border border-[#75C7E7] bg-[#BCE8F5] px-4 py-3 text-sm leading-6 text-[#182B49] md:col-span-2">
            Ce produit affichera le date picker, le formulaire message et le
            bouton de paiement.
          </div>
        ) : (
          <div className="rounded-md border border-[#75C7E7] bg-[#BCE8F5] px-4 py-3 text-sm leading-6 text-[#182B49] md:col-span-2">
            Ce produit n&apos;affichera pas le date picker. Le client pourra
            simplement remplir ses informations, ajouter la note pour sa
            consultation, puis passer au paiement.
          </div>
        )}
        <fieldset className="grid gap-3 rounded-md border border-[#75C7E7] bg-[#BCE8F5] p-4 md:col-span-2">
          <legend className="px-2 text-sm font-semibold">
            Champs client affichés
          </legend>
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              ["firstName", "Prénom"],
              ["name", "Nom"],
              ["email", "Email"],
              ["phone", "Téléphone"],
            ].map(([value, label]) => (
              <label
                className="flex items-center gap-2 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-3 py-2 text-sm font-semibold"
                key={value}
              >
                <input
                  className="size-4 accent-[#182B49]"
                  defaultChecked={(product.customerFields ?? "name,email")
                    .split(",")
                    .includes(value)}
                  name="customerFields"
                  type="checkbox"
                  value={value}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input
            className="size-5 accent-[#182B49]"
            defaultChecked={product.featured}
            name="featured"
            type="checkbox"
          />
          Produit phare
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Badge
          <input
            className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
            defaultValue={product.badge}
            name="badge"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Ordre
          <input
            className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
            defaultValue={product.sortOrder}
            name="sortOrder"
            type="number"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Jours réservables
          <input
            className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
            defaultValue={product.bookingDaysAhead}
            min="1"
            name="bookingDaysAhead"
            required
            type="number"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold md:col-span-2">
          Axe
          <input
            className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
            defaultValue={product.focus}
            name="focus"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold md:col-span-2">
          Description
          <textarea
            className="min-h-28 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 py-3 font-normal outline-none transition focus:border-[#182B49]"
            defaultValue={product.summary}
            name="summary"
            required
          />
        </label>
        <button
          className="min-h-12 rounded-full bg-[#182B49] px-6 text-sm font-bold text-[#F4F8FB] transition hover:bg-[#182B49] md:col-span-2"
          type="submit"
        >
          {isEditing ? "Enregistrer" : "Créer le produit"}
        </button>
      </form>

      {isEditing ? (
        <form action={deleteProduct} className="mt-4">
          <input name="id" type="hidden" value={product.id} />
          <button
            className="rounded-full border border-[#182B49] px-4 py-2 text-sm font-bold text-[#182B49] transition hover:bg-[#BCE8F5]"
            type="submit"
          >
            Supprimer ce produit et ses réservations
          </button>
        </form>
      ) : null}
    </div>
  );
}

function DatePickerPanel({
  products,
  updateProductDatePicker,
}: {
  products: AdminProduct[];
  updateProductDatePicker: (formData: FormData) => Promise<void>;
}) {
  const [selectedProductId, setSelectedProductId] = useState(
    products[0]?.id ?? 0,
  );
  const product =
    products.find((item) => item.id === selectedProductId) ?? products[0];

  if (!product) {
    return (
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
          Date picker
        </p>
        <h1 className="mt-3 text-4xl font-semibold md:text-6xl">
          Aucun produit
        </h1>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
            Date picker
          </p>
          <h1 className="mt-3 text-4xl font-semibold md:text-6xl">
            Disponibilités
          </h1>
        </div>
        <label className="grid gap-2 text-sm font-semibold">
          Produit de référence
          <select
            className="min-h-12 min-w-72 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
            onChange={(event) => setSelectedProductId(Number(event.target.value))}
            value={selectedProductId}
          >
            {products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <article className="rounded-lg border border-[#75C7E7] bg-[#F4F8FB] p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#182B49]">
            Produit lié
          </p>
          <h2 className="mt-3 text-3xl font-semibold">{product.title}</h2>
          <p className="mt-3 text-sm leading-6 text-[#182B49]">
            Les règles ci-dessous ne créent pas une nouvelle page. Elles sont
            rattachées à ce produit et utilisées sur sa fiche publique.
          </p>
          <div className="mt-5 grid gap-3 text-sm">
            <p>
              <span className="font-semibold">Slug :</span> {product.slug}
            </p>
            <p>
              <span className="font-semibold">Durée :</span>{" "}
              {product.duration ? `${product.duration} min` : "Non affichée"}
            </p>
            <p>
              <span className="font-semibold">Créneaux :</span>{" "}
              {product.slotDurationMinutes} min
            </p>
            <p>
              <span className="font-semibold">Jour même :</span>{" "}
              {product.allowSameDayBooking ? "Ouvert" : "Bloqué"}
            </p>
            <p>
              <span className="font-semibold">Tampon :</span>{" "}
              {product.bookingBufferMinutes
                ? `${product.bookingBufferMinutes} min`
                : "Aucun"}
            </p>
            <p>
              <span className="font-semibold">Réservations :</span>{" "}
              {product._count.bookings}
            </p>
          </div>
        </article>

        <form
          action={updateProductDatePicker}
          className="rounded-lg border border-[#75C7E7] bg-[#F4F8FB] p-0 shadow-sm"
          key={product.id}
        >
          <input name="id" type="hidden" value={product.id} />
          <div className="border-b border-[#75C7E7] bg-[#182B49] px-6 py-5 text-[#F4F8FB]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#FFD35A]">
              Planning public
            </p>
            <h2 className="mt-2 text-3xl font-semibold">Regles du date picker</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#BCE8F5]">
              Ces réglages pilotent les jours visibles, les fermetures et les
              dates bloquées sur la fiche produit.
            </p>
          </div>

          <div className="grid gap-5 p-6">
            <section className="grid gap-4 rounded-lg border border-[#75C7E7] bg-[#BCE8F5] p-5 md:grid-cols-[220px_1fr] md:items-start">
              <div>
                <h3 className="text-xl font-semibold">Fenêtre visible</h3>
                <p className="mt-2 text-sm leading-6 text-[#182B49]">
                  Combien de jours le client peut voir, et comment les créneaux
                  sont espacés.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-semibold">
                  Jours affichés
                  <input
                    className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
                    defaultValue={product.bookingDaysAhead}
                    min="1"
                    name="bookingDaysAhead"
                    required
                    type="number"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Durée d&apos;un créneau
                  <input
                    className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
                    defaultValue={product.slotDurationMinutes}
                    min="15"
                    name="slotDurationMinutes"
                    required
                    step="15"
                    type="number"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Tampon entre réservations
                  <input
                    className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
                    defaultValue={product.bookingBufferMinutes}
                    min="0"
                    name="bookingBufferMinutes"
                    required
                    step="15"
                    type="number"
                  />
                </label>
                <p className="rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 py-3 text-sm leading-6 text-[#182B49] md:col-span-3">
                  Exemple : créneau 60 min + tampon 60 min. Si 10h-11h est
                  réservé, 9h-10h et 11h-12h ne seront plus proposés au client.
                </p>
                <label className="flex items-start gap-3 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 py-3 text-sm font-semibold shadow-sm md:col-span-3">
                  <input
                    className="mt-1 size-5 accent-[#182B49]"
                    defaultChecked={product.allowSameDayBooking}
                    name="allowSameDayBooking"
                    type="checkbox"
                  />
                  <span>
                    Autoriser les réservations le jour même
                    <small className="mt-1 block text-xs font-semibold leading-5 text-[#425D78]">
                      Si cette option est désactivée, aujourd&apos;hui reste visible
                      dans le calendrier mais aucun créneau ne peut être choisi.
                    </small>
                  </span>
                </label>
              </div>
            </section>

            <section className="grid gap-4 rounded-lg border border-[#75C7E7] bg-[#BCE8F5] p-5 md:grid-cols-[220px_1fr] md:items-start">
              <div>
                <h3 className="text-xl font-semibold">Fermetures</h3>
                <p className="mt-2 text-sm leading-6 text-[#182B49]">
                  Bloque rapidement les jours fériés ou certains jours de la
                  semaine.
                </p>
              </div>
              <div className="grid gap-4">
                <label className="flex items-center gap-3 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 py-3 text-sm font-semibold shadow-sm">
                  <input
                    className="size-5 accent-[#182B49]"
                    defaultChecked={product.disableFrenchHolidays}
                    name="disableFrenchHolidays"
                    type="checkbox"
                  />
                  Bloquer les jours fériés français
                </label>
                <div className="grid gap-2 sm:grid-cols-4">
                  {[
                    ["1", "Lundi"],
                    ["2", "Mardi"],
                    ["3", "Mercredi"],
                    ["4", "Jeudi"],
                    ["5", "Vendredi"],
                    ["6", "Samedi"],
                    ["0", "Dimanche"],
                  ].map(([value, label]) => (
                    <label
                      className="flex items-center gap-2 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-3 py-2 text-sm font-semibold shadow-sm"
                      key={value}
                    >
                      <input
                        className="size-4 accent-[#182B49]"
                        defaultChecked={(product.disabledWeekdays ?? "")
                          .split(",")
                          .includes(value)}
                        name="disabledWeekdays"
                        type="checkbox"
                        value={value}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-4 rounded-lg border border-[#75C7E7] bg-[#BCE8F5] p-5 md:grid-cols-[220px_1fr] md:items-start">
              <div>
                <h3 className="text-xl font-semibold">Mois ouverts</h3>
                <p className="mt-2 text-sm leading-6 text-[#182B49]">
                  Si rien n&apos;est coché, tous les mois restent ouverts.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                {[
                  ["1", "Jan"],
                  ["2", "Fév"],
                  ["3", "Mar"],
                  ["4", "Avr"],
                  ["5", "Mai"],
                  ["6", "Juin"],
                  ["7", "Juil"],
                  ["8", "Août"],
                  ["9", "Sep"],
                  ["10", "Oct"],
                  ["11", "Nov"],
                  ["12", "Déc"],
                ].map(([value, label]) => (
                  <label
                    className="flex items-center gap-2 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-3 py-2 text-sm font-semibold shadow-sm"
                    key={value}
                  >
                    <input
                      className="size-4 accent-[#182B49]"
                      defaultChecked={(product.allowedMonths ?? "")
                        .split(",")
                        .includes(value)}
                      name="allowedMonths"
                      type="checkbox"
                      value={value}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </section>

            <section className="grid gap-4 rounded-lg border border-[#75C7E7] bg-[#BCE8F5] p-5 md:grid-cols-[220px_1fr] md:items-start">
              <div>
                <h3 className="text-xl font-semibold">Jours bloqués</h3>
                <p className="mt-2 text-sm leading-6 text-[#182B49]">
                  Bloque un jour du mois partout, ou seulement sur un mois
                  précis.
                </p>
              </div>
              <div className="grid gap-5">
                <div>
                  <p className="text-sm font-semibold">Tous les mois</p>
                  <div className="mt-3 grid max-h-48 grid-cols-4 gap-2 overflow-auto pr-1 sm:grid-cols-8">
                    {Array.from({ length: 31 }, (_, index) =>
                      String(index + 1),
                    ).map((value) => (
                      <label
                        className="flex items-center justify-center gap-2 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-3 py-2 text-sm font-semibold shadow-sm"
                        key={value}
                      >
                        <input
                          className="size-4 accent-[#182B49]"
                          defaultChecked={(product.disabledMonthDays ?? "")
                            .split(",")
                            .includes(value)}
                          name="disabledMonthDays"
                          type="checkbox"
                          value={value}
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                </div>
                <MonthDayBlockSelector value={product.disabledDaysByMonth ?? ""} />
              </div>
            </section>

            <div className="flex justify-end border-t border-[#75C7E7] pt-5">
              <button
                className="min-h-12 rounded-full bg-[#182B49] px-7 text-sm font-bold text-[#F4F8FB] transition hover:bg-[#182B49]"
                type="submit"
              >
                Enregistrer le date picker
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function MonthDayBlockSelector({ value }: { value: string }) {
  const monthOptions = [
    ["1", "Janvier"],
    ["2", "Février"],
    ["3", "Mars"],
    ["4", "Avril"],
    ["5", "Mai"],
    ["6", "Juin"],
    ["7", "Juillet"],
    ["8", "Août"],
    ["9", "Septembre"],
    ["10", "Octobre"],
    ["11", "Novembre"],
    ["12", "Décembre"],
  ];
  const [selectedMonth, setSelectedMonth] = useState("1");
  const [selectedValues, setSelectedValues] = useState(
    value.split(",").filter(Boolean),
  );

  return (
    <div className="grid gap-3 rounded-lg border border-[#75C7E7] bg-[#F4F8FB] p-4">
      <div>
        <h4 className="text-sm font-semibold">Par mois précis</h4>
        <p className="mt-1 text-sm leading-6 text-[#182B49]">
          Choisis un mois, puis coche uniquement les jours interdits pour ce
          mois.
        </p>
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        Mois
        <select
          className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
          onChange={(event) => setSelectedMonth(event.target.value)}
          value={selectedMonth}
        >
          {monthOptions.map(([month, label]) => (
            <option key={month} value={month}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid max-h-48 grid-cols-4 gap-2 overflow-auto pr-1 sm:grid-cols-8">
        {selectedValues.map((item) => (
          <input
            key={item}
            name="disabledDaysByMonth"
            type="hidden"
            value={item}
          />
        ))}
        {Array.from({ length: 31 }, (_, index) => String(index + 1)).map(
          (day) => {
            const optionValue = `${selectedMonth}:${day}`;
            const checked = selectedValues.includes(optionValue);

            return (
              <label
                className="flex items-center justify-center gap-2 rounded-md border border-[#75C7E7] bg-[#BCE8F5] px-3 py-2 text-sm font-semibold"
                key={optionValue}
              >
                <input
                  className="size-4 accent-[#182B49]"
                  checked={checked}
                  onChange={(event) => {
                    setSelectedValues((current) =>
                      event.target.checked
                        ? [...current, optionValue]
                        : current.filter((item) => item !== optionValue),
                    );
                  }}
                  type="checkbox"
                />
                {day}
              </label>
            );
          },
        )}
      </div>
    </div>
  );
}

type StatsPanelProps = {
  orders: AdminOrder[];
  products: AdminProduct[];
};

function OrdersPanel({
  orders,
  updateOrderStatus,
}: {
  orders: AdminOrder[];
  updateOrderStatus: (formData: FormData) => Promise<void>;
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const categories = [
    { label: "Toutes", status: "all" },
    { label: "Nouvelles", status: "new" },
    { label: "Confirmées", status: "confirmed" },
    { label: "Terminées", status: "done" },
    { label: "Annulées", status: "cancelled" },
  ];
  const filteredOrders =
    selectedCategory === "all"
      ? orders
      : orders.filter((order) => order.orderStatus === selectedCategory);

  return (
    <div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
          Commandes
        </p>
        <h1 className="mt-3 text-4xl font-semibold md:text-6xl">
          Commande passée
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-[#182B49]">
          Suis les commandes Stripe et passe le statut d&apos;une commande à
          « Terminée » quand la consultation est faite.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {categories.map((category) => {
          const count =
            category.status === "all"
              ? orders.length
              : orders.filter((order) => order.orderStatus === category.status)
                  .length;
          const isActive = selectedCategory === category.status;

          return (
            <button
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                isActive
                  ? "border-[#182B49] bg-[#182B49] text-[#F4F8FB]"
                  : "border-[#75C7E7] bg-[#F4F8FB] text-[#182B49] hover:border-[#182B49] hover:text-[#182B49]"
              }`}
              key={category.status}
              onClick={() => setSelectedCategory(category.status)}
              type="button"
            >
              {category.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4">
        {filteredOrders.map((order) => (
          <article
            className="rounded-lg border border-[#75C7E7] bg-[#F4F8FB] p-5 shadow-sm"
            key={order.id}
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#182B49]">
                  Commande #{order.id}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {order.consultation.title}
                </h2>
                <div className="mt-3 grid gap-2 text-sm leading-6 text-[#182B49] md:grid-cols-2">
                  <p>
                    <span className="font-semibold text-[#182B49]">Client :</span>{" "}
                    {[order.firstName, order.name].filter(Boolean).join(" ") ||
                      "Non renseigné"}
                    {order.email ? ` - ${order.email}` : ""}
                  </p>
                  {order.phone ? (
                    <p>
                      <span className="font-semibold text-[#182B49]">
                        Téléphone :
                      </span>{" "}
                      {order.phone}
                    </p>
                  ) : null}
                  <p>
                    <span className="font-semibold text-[#182B49]">Date :</span>{" "}
                    {order.preferredDate
                      ? new Date(order.preferredDate).toLocaleString("fr-FR")
                      : "Non définie"}
                  </p>
                  <p>
                    <span className="font-semibold text-[#182B49]">
                      Paiement :
                    </span>{" "}
                    {order.paymentStatus}
                  </p>
                  <p>
                    <span className="font-semibold text-[#182B49]">Montant :</span>{" "}
                    {order.discountPercent ? (
                      <>
                        <del className="mr-2 text-[#7A8C9D]">
                          {formatPriceFromCents(order.originalPriceCents)}
                        </del>
                        <strong>{formatPriceFromCents(order.paidAmountCents)}</strong>
                      </>
                    ) : (
                      formatPriceFromCents(order.paidAmountCents)
                    )}
                  </p>
                  {order.promotionCode ? (
                    <p>
                      <span className="font-semibold text-[#182B49]">
                        Code promo :
                      </span>{" "}
                      {order.promotionCode} (-{order.discountPercent}%)
                    </p>
                  ) : null}
                </div>
                {order.message ? (
                  <p className="mt-3 rounded-md bg-[#BCE8F5] px-4 py-3 text-sm text-[#182B49]">
                    {order.message}
                  </p>
                ) : null}
              </div>

              <form action={updateOrderStatus} className="grid gap-2">
                <input name="id" type="hidden" value={order.id} />
                <label className="grid gap-2 text-sm font-semibold">
                  Statut commande
                  <select
                    className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
                    defaultValue={order.orderStatus}
                    name="orderStatus"
                  >
                    <option value="new">Nouvelle</option>
                    <option value="confirmed">Confirmée</option>
                    <option value="done">Terminée</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </label>
                <button
                  className="min-h-11 rounded-full bg-[#182B49] px-5 text-sm font-bold text-[#F4F8FB] transition hover:bg-[#182B49]"
                  type="submit"
                >
                  Mettre à jour
                </button>
              </form>
            </div>
          </article>
        ))}

        {!filteredOrders.length ? (
          <div className="rounded-lg border border-[#75C7E7] bg-[#F4F8FB] p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#182B49]">
              Aucune commande dans cette catégorie
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getDateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function getLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getRelativeDateKey(dayOffset: number) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);

  return getLocalDateKey(date);
}

function matchesStatsPeriod(
  value: string,
  monthFilter: string,
  startDate: string,
  endDate: string,
) {
  const dateKey = getDateKey(value);

  if (monthFilter && dateKey.slice(0, 7) !== monthFilter) {
    return false;
  }

  if (startDate && dateKey < startDate) {
    return false;
  }

  if (endDate && dateKey > endDate) {
    return false;
  }

  return true;
}

function formatPeriodLabel(key: string, groupByDay: boolean) {
  if (groupByDay) {
    return new Date(`${key}T12:00:00`).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
  }

  return new Date(`${key}-01T12:00:00`).toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
  });
}

function formatStatsDateLabel(key: string) {
  return new Date(`${key}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getMonthTitle(monthKey: string) {
  return new Date(`${monthKey}-01T12:00:00`).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

function shiftMonth(monthKey: string, offset: number) {
  const date = new Date(`${monthKey}-01T12:00:00`);
  date.setMonth(date.getMonth() + offset);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function getCalendarDays(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const firstCalendarDay = new Date(firstDay);
  firstCalendarDay.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstCalendarDay);
    day.setDate(firstCalendarDay.getDate() + index);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(day.getDate()).padStart(2, "0")}`;

    return {
      dayOfMonth: day.getDate(),
      isCurrentMonth: day.getMonth() === month - 1,
      key,
    };
  });
}

type ChartMetric = "bookings" | "revenue";

type PeriodStat = {
  bookings: number;
  key: string;
  revenueCents: number;
};

type ChartPoint = {
  key: string;
  value: number;
  x: number;
  y: number;
};

const chartDimensions = {
  bottom: 292,
  height: 340,
  left: 72,
  right: 28,
  top: 28,
  width: 960,
} as const;

const euroAxisFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
  notation: "compact",
});

const averageFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
});

function getDayRangeLength(startDate: string, endDate: string) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const startTime = Date.UTC(startYear, startMonth - 1, startDay);
  const endTime = Date.UTC(endYear, endMonth - 1, endDay);

  return Math.floor((endTime - startTime) / 86_400_000) + 1;
}

function getDayKeys(startDate: string, endDate: string) {
  const keys: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00`);
  const limit = new Date(`${endDate}T12:00:00`);

  while (cursor <= limit) {
    keys.push(getLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

function getMonthKeys(startMonth: string, endMonth: string) {
  const keys: string[] = [];
  let cursor = startMonth;

  while (cursor <= endMonth) {
    keys.push(cursor);
    cursor = shiftMonth(cursor, 1);
  }

  return keys;
}

function getStatsPeriodKeys({
  endDate,
  groupByDay,
  monthFilter,
  orders,
  startDate,
}: {
  endDate: string;
  groupByDay: boolean;
  monthFilter: string;
  orders: AdminOrder[];
  startDate: string;
}) {
  if (groupByDay) {
    if (monthFilter) {
      const [year, month] = monthFilter.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const naturalEnd = `${monthFilter}-${String(lastDay).padStart(2, "0")}`;
      const today = getRelativeDateKey(0);
      const monthEnd = monthFilter === today.slice(0, 7) ? today : naturalEnd;

      return getDayKeys(`${monthFilter}-01`, monthEnd);
    }

    const rangeStart = startDate || endDate || getRelativeDateKey(0);
    const rangeEnd = endDate || startDate || rangeStart;

    return getDayKeys(rangeStart, rangeEnd);
  }

  if (startDate && endDate) {
    return getMonthKeys(startDate.slice(0, 7), endDate.slice(0, 7));
  }

  const currentMonth = getRelativeDateKey(0).slice(0, 7);
  const latestOrderMonth = orders.reduce(
    (latest, order) => {
      const orderMonth = getDateKey(order.createdAt).slice(0, 7);
      return orderMonth > latest ? orderMonth : latest;
    },
    currentMonth,
  );

  return Array.from({ length: 6 }, (_, index) =>
    shiftMonth(latestOrderMonth, index - 5),
  );
}

function getMetricValue(stat: PeriodStat, metric: ChartMetric) {
  return metric === "bookings" ? stat.bookings : stat.revenueCents;
}

function getNiceRevenueStep(maxValue: number) {
  const roughStep = Math.max(100, maxValue / 4);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceNormalized =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 5
            ? 5
            : 10;

  return niceNormalized * magnitude;
}

function getChartScale(values: number[], metric: ChartMetric) {
  const maxValue = Math.max(0, ...values);
  const step =
    metric === "bookings"
      ? Math.max(1, Math.ceil(maxValue / 4))
      : getNiceRevenueStep(maxValue || 10_000);
  const scaleMax = Math.max(
    metric === "bookings" ? 4 : step,
    Math.ceil(maxValue / step) * step,
  );
  const tickCount = Math.round(scaleMax / step);

  return {
    max: scaleMax,
    ticks: Array.from({ length: tickCount + 1 }, (_, index) => index * step),
  };
}

function getCurvePoints(
  periodStats: PeriodStat[],
  metric: ChartMetric,
  scaleMax: number,
) {
  const plotWidth =
    chartDimensions.width - chartDimensions.left - chartDimensions.right;
  const plotHeight = chartDimensions.bottom - chartDimensions.top;
  const divisor = Math.max(1, periodStats.length - 1);

  return periodStats.map((stat, index) => {
    const value = getMetricValue(stat, metric);
    const x =
      periodStats.length === 1
        ? chartDimensions.left + plotWidth / 2
        : chartDimensions.left + (index / divisor) * plotWidth;

    return {
      key: stat.key,
      value,
      x,
      y: chartDimensions.bottom - (value / scaleMax) * plotHeight,
    };
  });
}

function getSmoothPath(points: ChartPoint[]) {
  if (!points.length) {
    return "";
  }

  if (points.length === 1) {
    return `M ${chartDimensions.left} ${points[0].y} L ${chartDimensions.width - chartDimensions.right} ${points[0].y}`;
  }

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const controlOffset = (point.x - previous.x) * 0.36;

    return `${path} C ${previous.x + controlOffset} ${previous.y}, ${point.x - controlOffset} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function getLabelIndexes(length: number) {
  if (length <= 6) {
    return Array.from({ length }, (_, index) => index);
  }

  return Array.from(
    new Set(
      Array.from({ length: 6 }, (_, index) =>
        Math.round((index / 5) * (length - 1)),
      ),
    ),
  );
}

function formatAxisValue(value: number, metric: ChartMetric) {
  if (metric === "bookings") {
    return String(value);
  }

  return `${euroAxisFormatter.format(value / 100)} €`;
}

function formatMetricValue(value: number, metric: ChartMetric) {
  if (metric === "bookings") {
    return `${value} réservation${value === 1 ? "" : "s"}`;
  }

  return formatPriceFromCents(value);
}

function formatSignedMetricValue(value: number, metric: ChartMetric) {
  const prefix = value > 0 ? "+" : "";

  if (metric === "bookings") {
    return `${prefix}${value}`;
  }

  return `${prefix}${formatPriceFromCents(value)}`;
}

function formatTooltipPeriod(key: string, groupByDay: boolean) {
  return new Date(`${key}${groupByDay ? "" : "-01"}T12:00:00`).toLocaleDateString(
    "fr-FR",
    groupByDay
      ? { day: "numeric", month: "short", year: "numeric" }
      : { month: "long", year: "numeric" },
  );
}

function ActivityCurve({
  groupByDay,
  periodStats,
}: {
  groupByDay: boolean;
  periodStats: PeriodStat[];
}) {
  const [metric, setMetric] = useState<ChartMetric>("bookings");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const values = periodStats.map((stat) => getMetricValue(stat, metric));
  const scale = getChartScale(values, metric);
  const points = getCurvePoints(periodStats, metric, scale.max);
  const curvePath = getSmoothPath(points);
  const curveStartX =
    points.length === 1 ? chartDimensions.left : (points[0]?.x ?? 0);
  const curveEndX =
    points.length === 1
      ? chartDimensions.width - chartDimensions.right
      : (points.at(-1)?.x ?? 0);
  const areaPath = curvePath
    ? `${curvePath} L ${curveEndX} ${chartDimensions.bottom} L ${curveStartX} ${chartDimensions.bottom} Z`
    : "";
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = periodStats.length ? total / periodStats.length : 0;
  const latest = values.at(-1) ?? 0;
  const previous = values.at(-2) ?? latest;
  const variation = latest - previous;
  const resolvedActiveIndex = points.length
    ? Math.min(activeIndex ?? points.length - 1, points.length - 1)
    : -1;
  const activePoint = points[resolvedActiveIndex];
  const activePeriod = periodStats[resolvedActiveIndex];
  const labelIndexes = getLabelIndexes(periodStats.length);
  const tooltipWidth = 174;
  const tooltipHeight = 58;
  const tooltipX = activePoint
    ? Math.min(
        Math.max(activePoint.x - tooltipWidth / 2, chartDimensions.left),
        chartDimensions.width - chartDimensions.right - tooltipWidth,
      )
    : 0;
  const tooltipY = activePoint
    ? activePoint.y < chartDimensions.top + tooltipHeight + 16
      ? activePoint.y + 16
      : activePoint.y - tooltipHeight - 16
    : 0;
  const chartTitle =
    metric === "bookings"
      ? `Réservations par ${groupByDay ? "jour" : "mois"}`
      : `CA payé par ${groupByDay ? "jour" : "mois"}`;
  const chartAriaLabel =
    metric === "bookings"
      ? `Courbe des réservations par ${groupByDay ? "jour" : "mois"}`
      : `Courbe du chiffre d'affaires payé par ${groupByDay ? "jour" : "mois"}`;
  const averageValue =
    metric === "bookings"
      ? averageFormatter.format(average)
      : formatPriceFromCents(Math.round(average));

  return (
    <section
      className="min-w-0 rounded-lg border border-[#75C7E7] bg-[#F4F8FB] p-5 shadow-sm xl:col-span-2 md:p-6"
      data-testid="stats-activity-chart"
    >
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#425D78]">
            Évolution
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{chartTitle}</h2>
          <p className="mt-2 text-sm text-[#425D78]">
            Lecture {groupByDay ? "quotidienne" : "mensuelle"} de la période
            affichée.
          </p>
        </div>
        <div
          aria-label="Mesure affichée"
          className="inline-flex w-fit rounded-md border border-[#75C7E7] bg-white p-1"
          role="group"
        >
          {([
            ["bookings", "Réservations"],
            ["revenue", "CA payé"],
          ] as const).map(([value, label]) => (
            <button
              aria-pressed={metric === value}
              className={`min-h-10 rounded px-4 text-sm font-bold transition ${
                metric === value
                  ? "bg-[#182B49] text-white"
                  : "text-[#182B49] hover:bg-[#BCE8F5]"
              }`}
              key={value}
              onClick={() => {
                setActiveIndex(null);
                setMetric(value);
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <dl className="mt-5 grid border-y border-[#C7DFEA] py-4 sm:grid-cols-3 sm:divide-x sm:divide-[#C7DFEA]">
        <div className="py-2 sm:px-5 sm:first:pl-0">
          <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#425D78]">
            Total affiché
          </dt>
          <dd className="mt-1 text-2xl font-bold text-[#182B49]">
            {formatMetricValue(total, metric)}
          </dd>
        </div>
        <div className="py-2 sm:px-5">
          <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#425D78]">
            Moyenne / {groupByDay ? "jour" : "mois"}
          </dt>
          <dd className="mt-1 text-2xl font-bold text-[#182B49]">
            {averageValue}
          </dd>
        </div>
        <div className="py-2 sm:px-5">
          <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#425D78]">
            Écart vs précédent
          </dt>
          <dd
            className={`mt-1 text-2xl font-bold ${
              variation > 0
                ? "text-[#176B4D]"
                : variation < 0
                  ? "text-[#A73B3B]"
                  : "text-[#182B49]"
            }`}
          >
            {formatSignedMetricValue(variation, metric)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 overflow-x-auto overscroll-x-contain">
        <div className="mx-auto aspect-[960/340] min-w-[720px] max-w-[1120px]">
          <svg
            aria-label={chartAriaLabel}
            className="block size-full"
            onMouseLeave={() => setActiveIndex(null)}
            role="img"
            viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
          >
            <title>{chartTitle}</title>
            <defs>
              <linearGradient
                id="stats-curve-fill"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#75C7E7" stopOpacity="0.48" />
                <stop offset="100%" stopColor="#75C7E7" stopOpacity="0.03" />
              </linearGradient>
            </defs>

            <rect
              fill="#FFFFFF"
              height={chartDimensions.bottom - chartDimensions.top}
              rx="8"
              width={
                chartDimensions.width -
                chartDimensions.left -
                chartDimensions.right
              }
              x={chartDimensions.left}
              y={chartDimensions.top}
            />

            {scale.ticks.map((tick) => {
              const y =
                chartDimensions.bottom -
                (tick / scale.max) *
                  (chartDimensions.bottom - chartDimensions.top);

              return (
                <g key={tick}>
                  <line
                    stroke={tick === 0 ? "#9EC9DB" : "#D4E5EC"}
                    strokeDasharray={tick === 0 ? undefined : "4 7"}
                    strokeWidth="1"
                    x1={chartDimensions.left}
                    x2={chartDimensions.width - chartDimensions.right}
                    y1={y}
                    y2={y}
                  />
                  <text
                    fill="#425D78"
                    fontSize="12"
                    fontWeight="700"
                    textAnchor="end"
                    x={chartDimensions.left - 14}
                    y={y + 4}
                  >
                    {formatAxisValue(tick, metric)}
                  </text>
                </g>
              );
            })}

            {activePoint ? (
              <line
                stroke="#E3A817"
                strokeDasharray="3 6"
                strokeWidth="1.5"
                x1={activePoint.x}
                x2={activePoint.x}
                y1={chartDimensions.top}
                y2={chartDimensions.bottom}
              />
            ) : null}

            <path
              className="admin-stats-area"
              d={areaPath}
              fill="url(#stats-curve-fill)"
            />
            <path
              className="admin-stats-curve"
              d={curvePath}
              fill="none"
              pathLength="1"
              stroke="#1D5A79"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />

            {points.map((point, index) => (
              <circle
                cx={point.x}
                cy={point.y}
                fill={index === resolvedActiveIndex ? "#FFD35A" : "#FFFFFF"}
                key={point.key}
                r={index === resolvedActiveIndex ? 6 : 4}
                stroke="#1D5A79"
                strokeWidth="3"
              />
            ))}

            {points.map((point, index) => {
              const previousPoint = points[index - 1];
              const nextPoint = points[index + 1];
              const hitStart = previousPoint
                ? (previousPoint.x + point.x) / 2
                : chartDimensions.left;
              const hitEnd = nextPoint
                ? (point.x + nextPoint.x) / 2
                : chartDimensions.width - chartDimensions.right;

              return (
                <rect
                  aria-label={`${formatTooltipPeriod(point.key, groupByDay)}, ${formatMetricValue(point.value, metric)}`}
                  fill="transparent"
                  height={chartDimensions.bottom - chartDimensions.top}
                  key={point.key}
                  onBlur={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="img"
                  tabIndex={0}
                  width={hitEnd - hitStart}
                  x={hitStart}
                  y={chartDimensions.top}
                />
              );
            })}

            {labelIndexes.map((index) => {
              const stat = periodStats[index];
              const point = points[index];

              if (!stat || !point) {
                return null;
              }

              return (
                <text
                  fill="#425D78"
                  fontSize="12"
                  fontWeight="700"
                  key={stat.key}
                  textAnchor="middle"
                  x={point.x}
                  y="326"
                >
                  {formatPeriodLabel(stat.key, groupByDay)}
                </text>
              );
            })}

            {activePoint && activePeriod ? (
              <g
                aria-hidden="true"
                pointerEvents="none"
                transform={`translate(${tooltipX} ${tooltipY})`}
              >
                <rect
                  fill="#182B49"
                  height={tooltipHeight}
                  rx="7"
                  width={tooltipWidth}
                />
                <text
                  fill="#BCE8F5"
                  fontSize="11"
                  fontWeight="700"
                  x="13"
                  y="20"
                >
                  {formatTooltipPeriod(activePeriod.key, groupByDay)}
                </text>
                <text
                  fill="#FFFFFF"
                  fontSize="15"
                  fontWeight="800"
                  x="13"
                  y="43"
                >
                  {formatMetricValue(activePoint.value, metric)}
                </text>
              </g>
            ) : null}
          </svg>
        </div>
      </div>
    </section>
  );
}

function StatsPanel({ orders, products }: StatsPanelProps) {
  const [monthFilter, setMonthFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const latestOrder = [...orders].sort((left, right) =>
      getDateKey(right.createdAt).localeCompare(getDateKey(left.createdAt)),
    )[0];

    return latestOrder
      ? getDateKey(latestOrder.createdAt).slice(0, 7)
      : getRelativeDateKey(0).slice(0, 7);
  });
  const monthOptions = useMemo(() => {
    const currentMonth = getRelativeDateKey(0).slice(0, 7);
    const months = new Set([
      currentMonth,
      shiftMonth(currentMonth, -1),
      ...orders.map((order) => getDateKey(order.createdAt).slice(0, 7)),
    ]);

    return Array.from(months)
      .sort((left, right) => right.localeCompare(left))
      .map((month) => ({
        label: formatPeriodLabel(month, false),
        value: month,
      }));
  }, [orders]);
  const filteredOrders = useMemo(
    () =>
      orders.filter((order) =>
        matchesStatsPeriod(order.createdAt, monthFilter, startDate, endDate),
      ),
    [endDate, monthFilter, orders, startDate],
  );
  const paidRevenue = filteredOrders.reduce(
    (sum, order) =>
      order.paymentStatus === "paid" ? sum + order.paidAmountCents : sum,
    0,
  );
  const potentialRevenue = filteredOrders.reduce(
    (sum, order) => sum + order.originalPriceCents,
    0,
  );
  const productStats = products.map((product) => ({
    count: filteredOrders.filter((order) => order.consultationId === product.id)
      .length,
    id: product.id,
    title: product.title,
  }));
  const maxBookings = Math.max(1, ...productStats.map((product) => product.count));
  const groupByDay =
    Boolean(monthFilter) ||
    Boolean(
      startDate &&
        endDate &&
        getDayRangeLength(startDate, endDate) <= 45,
    );
  const periodStats = useMemo(() => {
    const periodKeys = getStatsPeriodKeys({
      endDate,
      groupByDay,
      monthFilter,
      orders,
      startDate,
    });
    const buckets = new Map<string, PeriodStat>(
      periodKeys.map((key) => [
        key,
        {
          bookings: 0,
          key,
          revenueCents: 0,
        },
      ]),
    );

    filteredOrders.forEach((order) => {
      const key = getDateKey(order.createdAt).slice(0, groupByDay ? 10 : 7);
      const bucket = buckets.get(key);

      if (!bucket) {
        return;
      }

      bucket.bookings += 1;

      if (order.paymentStatus === "paid") {
        bucket.revenueCents += order.paidAmountCents;
      }
    });

    return Array.from(buckets.values());
  }, [endDate, filteredOrders, groupByDay, monthFilter, orders, startDate]);
  const orderStatusStats = [
    ["new", "Nouvelles"],
    ["confirmed", "Confirmées"],
    ["done", "Terminées"],
    ["cancelled", "Annulées"],
  ].map(([status, label]) => ({
    count: filteredOrders.filter((order) => order.orderStatus === status).length,
    label,
    status,
  }));
  const handleRangeDayClick = (dayKey: string) => {
    setMonthFilter("");

    if (!startDate || !endDate) {
      setStartDate(dayKey);
      setEndDate(dayKey);
      return;
    }

    if (startDate === endDate) {
      if (dayKey < startDate) {
        setStartDate(dayKey);
        return;
      }

      setEndDate(dayKey);
      return;
    }

    setStartDate(dayKey);
    setEndDate(dayKey);
  };
  const handlePresetRange = (daysBack: number) => {
    const start = getRelativeDateKey(-daysBack);
    const end = getRelativeDateKey(0);

    setEndDate(end);
    setMonthFilter("");
    setStartDate(start);
    setCalendarMonth(start.slice(0, 7));
  };
  const resetStatsFilters = () => {
    setEndDate("");
    setMonthFilter("");
    setStartDate("");
    setCalendarMonth(monthOptions[0]?.value ?? getRelativeDateKey(0).slice(0, 7));
  };
  const todayKey = getRelativeDateKey(0);
  const currentMonthKey = todayKey.slice(0, 7);
  const previousMonthKey = shiftMonth(currentMonthKey, -1);
  const selectedPeriodLabel = monthFilter
    ? (monthOptions.find((month) => month.value === monthFilter)?.label ??
      monthFilter)
    : startDate && endDate
      ? startDate === endDate
        ? formatStatsDateLabel(startDate)
        : `${formatStatsDateLabel(startDate)} au ${formatStatsDateLabel(endDate)}`
      : "Toutes les données";

  const handleMonthChange = (value: string) => {
    setEndDate("");
    setMonthFilter(value);
    setStartDate("");

    if (value) {
      setCalendarMonth(value);
      return;
    }

    setCalendarMonth(monthOptions[0]?.value ?? getRelativeDateKey(0).slice(0, 7));
  };

  const handleCurrentMonth = () => {
    handleMonthChange(currentMonthKey);
  };

  const handleToday = () => {
    setEndDate(todayKey);
    setMonthFilter("");
    setStartDate(todayKey);
    setCalendarMonth(currentMonthKey);
  };

  const handlePreviousMonth = () => {
    handleMonthChange(previousMonthKey);
  };

  const quickFilters = [
    {
      active: !monthFilter && !startDate && !endDate,
      id: "all",
      label: "Tout",
      onClick: resetStatsFilters,
    },
    {
      active:
        !monthFilter && startDate === todayKey && endDate === todayKey,
      id: "today",
      label: "Aujourd'hui",
      onClick: handleToday,
    },
    {
      active:
        !monthFilter &&
        startDate === getRelativeDateKey(-6) &&
        endDate === todayKey,
      id: "seven-days",
      label: "7 jours",
      onClick: () => handlePresetRange(6),
    },
    {
      active:
        !monthFilter &&
        startDate === getRelativeDateKey(-29) &&
        endDate === todayKey,
      id: "thirty-days",
      label: "30 jours",
      onClick: () => handlePresetRange(29),
    },
    {
      active: monthFilter === currentMonthKey,
      id: "current-month",
      label: "Mois courant",
      onClick: handleCurrentMonth,
    },
    {
      active: monthFilter === previousMonthKey,
      id: "previous-month",
      label: "Mois dernier",
      onClick: handlePreviousMonth,
    },
  ];
  const hasActivePeriod = Boolean(monthFilter || startDate || endDate);

  return (
    <div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
          Stats
        </p>
        <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
          Tableau de bord
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-[#182B49]">
          Suis les réservations, les paiements et les statuts de commande sur
          la période que tu choisis.
        </p>
      </div>

      <section
        className="mt-8 overflow-hidden rounded-lg border border-[#75C7E7] bg-white shadow-sm"
        data-testid="stats-period-filters"
      >
        <div className="flex flex-col justify-between gap-5 bg-[#F4F8FB] px-5 py-5 md:px-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#425D78]">
              Filtres
            </p>
            <h2 className="mt-1 text-2xl font-semibold">Période</h2>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="min-w-0 border-l-4 border-[#FFD35A] pl-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#425D78]">
                Affichage
              </p>
              <p
                aria-live="polite"
                className="mt-1 max-w-xl text-sm font-bold text-[#182B49]"
              >
                {selectedPeriodLabel}
              </p>
            </div>
            {hasActivePeriod ? (
              <button
                aria-label="Réinitialiser les filtres de période"
                className="min-h-10 rounded-md border border-[#75C7E7] px-4 text-sm font-bold text-[#182B49] transition hover:border-[#182B49] hover:bg-[#BCE8F5]"
                onClick={resetStatsFilters}
                type="button"
              >
                Effacer
              </button>
            ) : null}
          </div>
        </div>

        <div className="border-t border-[#C7DFEA] px-5 py-4 md:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#425D78]">
            Raccourcis
          </p>
          <div
            aria-label="Raccourcis de période"
            className="mt-3 flex flex-wrap gap-1 rounded-md bg-[#EDF4F7] p-1"
            role="group"
          >
            {quickFilters.map((filter) => (
              <button
                aria-pressed={filter.active}
                className={`min-h-10 rounded px-4 text-sm font-bold transition ${
                  filter.active
                    ? "bg-[#182B49] text-white shadow-sm"
                    : "text-[#182B49] hover:bg-white"
                }`}
                key={filter.id}
                onClick={filter.onClick}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid border-t border-[#C7DFEA] lg:grid-cols-[320px_1fr]">
          <div className="border-b border-[#C7DFEA] p-5 md:p-6 lg:border-r lg:border-b-0">
            <label className="grid gap-2 text-sm font-bold text-[#182B49]">
              Mois complet
              <select
                className="min-h-12 rounded-md border border-[#A9CEDD] bg-white px-4 font-normal outline-none transition focus:border-[#182B49] focus:ring-2 focus:ring-[#BCE8F5]"
                onChange={(event) => handleMonthChange(event.target.value)}
                value={monthFilter}
              >
                <option value="">Tous les mois</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>

            <dl className="mt-6 border-y border-[#D7E6EC]">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#425D78]">
                  Début
                </dt>
                <dd className="text-right text-sm font-bold text-[#182B49]">
                  {startDate ? formatStatsDateLabel(startDate) : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-[#D7E6EC] py-3">
                <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#425D78]">
                  Fin
                </dt>
                <dd className="text-right text-sm font-bold text-[#182B49]">
                  {endDate ? formatStatsDateLabel(endDate) : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <DateRangeSelector
            calendarMonth={calendarMonth}
            endDate={endDate}
            onDayClick={handleRangeDayClick}
            setCalendarMonth={setCalendarMonth}
            startDate={startDate}
          />
        </div>
      </section>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Produits" value={products.length} />
        <StatCard label="Réservations" value={filteredOrders.length} />
        <StatCard label="CA payé" value={formatPriceFromCents(paidRevenue)} />
        <StatCard
          label="CA potentiel"
          value={formatPriceFromCents(potentialRevenue)}
        />
      </div>

      <div className="mt-8 grid min-w-0 gap-6 xl:grid-cols-2">
        <ActivityCurve groupByDay={groupByDay} periodStats={periodStats} />

        <section className="rounded-lg border border-[#75C7E7] bg-[#F4F8FB] p-5 shadow-sm">
          <h2 className="text-2xl font-semibold">Réservations par produit</h2>
          <div className="mt-6 grid gap-4">
            {productStats.map((product) => (
              <div key={product.id}>
                <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                  <span>{product.title}</span>
                  <span className="text-[#182B49]">{product.count}</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#BCE8F5]">
                  <div
                    className="h-full rounded-full bg-[#182B49]"
                    style={{
                      width: `${Math.max(
                        4,
                        (product.count / maxBookings) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[#75C7E7] bg-[#F4F8FB] p-5 shadow-sm">
          <h2 className="text-2xl font-semibold">Commandes par statut</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {orderStatusStats.map((item) => (
              <article
                className="rounded-lg border border-[#75C7E7] bg-[#BCE8F5] p-4"
                key={item.status}
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#425D78]">
                  {item.label}
                </p>
                <p className="mt-3 text-4xl font-bold text-[#182B49]">
                  {item.count}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function DateRangeSelector({
  calendarMonth,
  endDate,
  onDayClick,
  setCalendarMonth,
  startDate,
}: {
  calendarMonth: string;
  endDate: string;
  onDayClick: (dayKey: string) => void;
  setCalendarMonth: (month: string) => void;
  startDate: string;
}) {
  const days = getCalendarDays(calendarMonth);
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const rangeEnd = endDate || startDate;
  const todayKey = getRelativeDateKey(0);
  const selectedRangeLabel = startDate
    ? startDate === rangeEnd
      ? formatStatsDateLabel(startDate)
      : `${formatStatsDateLabel(startDate)} au ${formatStatsDateLabel(rangeEnd)}`
    : "Aucune date sélectionnée";

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-[720px]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#425D78]">
              Plage personnalisée
            </p>
            <h3 className="mt-1 text-lg font-semibold capitalize text-[#182B49]">
              {getMonthTitle(calendarMonth)}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <p className="text-sm font-semibold text-[#425D78]">
              {selectedRangeLabel}
            </p>
            <div className="flex gap-2">
              <button
                aria-label="Mois précédent"
                className="size-10 rounded-md border border-[#A9CEDD] bg-white text-lg font-bold transition hover:border-[#182B49] hover:bg-[#FFD35A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#182B49]"
                onClick={() => setCalendarMonth(shiftMonth(calendarMonth, -1))}
                type="button"
              >
                ←
              </button>
              <button
                aria-label="Mois suivant"
                className="size-10 rounded-md border border-[#A9CEDD] bg-white text-lg font-bold transition hover:border-[#182B49] hover:bg-[#FFD35A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#182B49]"
                onClick={() => setCalendarMonth(shiftMonth(calendarMonth, 1))}
                type="button"
              >
                →
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-x-1 gap-y-2 text-center">
          {weekDays.map((day) => (
            <span
              className="py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#425D78]"
              key={day}
            >
              {day}
            </span>
          ))}
          {days.map((day) => {
            const isStart = day.key === startDate;
            const isEnd = day.key === endDate;
            const isEndpoint = isStart || isEnd;
            const isToday = day.key === todayKey;
            const isInRange =
              Boolean(startDate && rangeEnd) &&
              day.key >= startDate &&
              day.key <= rangeEnd;

            return (
              <button
                aria-current={isToday ? "date" : undefined}
                aria-label={formatStatsDateLabel(day.key)}
                aria-pressed={isEndpoint || isInRange}
                className={`h-10 rounded-md border text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#182B49] focus-visible:ring-offset-1 ${
                  isEndpoint
                    ? "border-[#182B49] bg-[#182B49] text-white ring-2 ring-[#FFD35A] ring-offset-1"
                    : isInRange
                      ? "border-[#D9F1F8] bg-[#D9F1F8] text-[#182B49]"
                      : isToday
                        ? "border-[#E3A817] bg-[#FFF8DC] text-[#182B49]"
                        : day.isCurrentMonth
                          ? "border-transparent bg-white text-[#182B49] hover:border-[#75C7E7] hover:bg-[#EDF8FB]"
                          : "border-transparent bg-[#EFF4F6] text-[#7B8E9C] hover:border-[#C7DFEA]"
                }`}
                key={day.key}
                onClick={() => onDayClick(day.key)}
                type="button"
              >
                {day.dayOfMonth}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="rounded-lg border border-[#75C7E7] bg-[#F4F8FB] p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#182B49]">
        {label}
      </p>
      <p className="mt-3 text-4xl font-bold">{value}</p>
    </article>
  );
}
