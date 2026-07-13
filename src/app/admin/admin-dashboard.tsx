"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatProductBadge } from "@/lib/product-labels";

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

type AdminDashboardProps = {
  createProduct: (formData: FormData) => Promise<void>;
  deleteProduct: (formData: FormData) => Promise<void>;
  disconnectGoogleCalendar: () => Promise<void>;
  googleCalendarNotice: GoogleCalendarNotice;
  googleCalendarStatus: GoogleCalendarStatus;
  initialView: AdminView;
  orders: AdminOrder[];
  products: AdminProduct[];
  updateOrderStatus: (formData: FormData) => Promise<void>;
  updateProduct: (formData: FormData) => Promise<void>;
  updateProductDatePicker: (formData: FormData) => Promise<void>;
  userLabel: string;
};

type AdminOrder = {
  consultation: {
    price: number;
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
  preferredDate: string | null;
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
  createProduct,
  deleteProduct,
  disconnectGoogleCalendar,
  googleCalendarNotice,
  googleCalendarStatus,
  initialView,
  orders,
  products,
  updateOrderStatus,
  updateProduct,
  updateProductDatePicker,
  userLabel,
}: AdminDashboardProps) {
  const [activeView, setActiveView] = useState<AdminView>(initialView);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductFormValues | null>(null);
  const paidRevenue = orders.reduce(
    (sum, order) =>
      order.paymentStatus === "paid" ? sum + order.consultation.price : sum,
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
            <strong>{paidRevenue}€</strong>
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
                    {order.consultation.price} EUR
                  </p>
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

type PeriodStat = [string, number];

type ChartPoint = {
  count: number;
  label: string;
  x: number;
  y: number;
};

function getCurvePoints(periodStats: PeriodStat[]) {
  const width = 720;
  const height = 280;
  const paddingX = 44;
  const paddingY = 30;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const maxCount = Math.max(1, ...periodStats.map(([, count]) => count));
  const divisor = Math.max(1, periodStats.length - 1);

  return periodStats.map(([period, count], index) => ({
    count,
    label: period,
    x: paddingX + (index / divisor) * chartWidth,
    y: paddingY + (1 - count / maxCount) * chartHeight,
  }));
}

function getSmoothPath(points: ChartPoint[]) {
  if (!points.length) {
    return "";
  }

  const [firstPoint, ...restPoints] = points;

  return restPoints.reduce((path, point, index) => {
    const previous = points[index];
    const controlX = (previous.x + point.x) / 2;

    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${firstPoint.x} ${firstPoint.y}`);
}

function ReservationsCurve({
  groupByDay,
  periodStats,
}: {
  groupByDay: boolean;
  periodStats: PeriodStat[];
}) {
  const points = getCurvePoints(periodStats);
  const curvePath = getSmoothPath(points);
  const baseline = 250;
  const areaPath = points.length
    ? `${curvePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`
    : "";
  const maxCount = Math.max(1, ...periodStats.map(([, count]) => count));
  const total = periodStats.reduce((sum, [, count]) => sum + count, 0);
  const latest = periodStats.at(-1)?.[1] ?? 0;
  const previous = periodStats.at(-2)?.[1] ?? latest;
  const trend = latest - previous;
  const labelIndexes = Array.from(
    new Set([
      0,
      Math.floor((periodStats.length - 1) / 2),
      periodStats.length - 1,
    ]),
  ).filter((index) => index >= 0);

  return (
    <section className="rounded-lg border border-[#75C7E7] bg-[#F4F8FB] p-5 shadow-sm xl:col-span-2">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#425D78]">
            Rythme
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {groupByDay ? "Réservations par jour" : "Réservations par mois"}
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
          <StatCard label="Total période" value={total} />
          <StatCard label="Dernier point" value={latest} />
          <StatCard
            label="Variation"
            value={trend > 0 ? `+${trend}` : trend}
          />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[#75C7E7] bg-[#BCE8F5] p-4">
        {periodStats.length ? (
          <div className="min-w-[680px]">
            <svg
              aria-label={
                groupByDay
                  ? "Courbe des réservations par jour"
                  : "Courbe des réservations par mois"
              }
              className="h-[300px] w-full"
              role="img"
              viewBox="0 0 720 300"
            >
              <defs>
                <linearGradient id="stats-curve-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#FFD35A" stopOpacity="0.58" />
                  <stop offset="100%" stopColor="#FFD35A" stopOpacity="0.04" />
                </linearGradient>
              </defs>
              {[30, 140, 250].map((y, index) => (
                <g key={y}>
                  <line
                    stroke="#75C7E7"
                    strokeDasharray={index === 2 ? "0" : "6 6"}
                    strokeWidth="1"
                    x1="44"
                    x2="676"
                    y1={y}
                    y2={y}
                  />
                  <text
                    fill="#182B49"
                    fontSize="12"
                    fontWeight="700"
                    textAnchor="end"
                    x="34"
                    y={y + 4}
                  >
                    {index === 0
                      ? maxCount
                      : index === 1
                        ? Math.ceil(maxCount / 2)
                        : 0}
                  </text>
                </g>
              ))}
              <path d={areaPath} fill="url(#stats-curve-fill)" />
              <path
                d={curvePath}
                fill="none"
                stroke="#182B49"
                strokeLinecap="round"
                strokeWidth="5"
              />
              <path
                d={curvePath}
                fill="none"
                stroke="#FFD35A"
                strokeLinecap="round"
                strokeWidth="2"
              />
              {points.map((point) => (
                <g key={point.label}>
                  <circle cx={point.x} cy={point.y} fill="#182B49" r="6" />
                  <circle cx={point.x} cy={point.y} fill="#FFD35A" r="3" />
                  <text
                    fill="#182B49"
                    fontSize="12"
                    fontWeight="800"
                    textAnchor="middle"
                    x={point.x}
                    y={Math.max(16, point.y - 12)}
                  >
                    {point.count}
                  </text>
                </g>
              ))}
              {labelIndexes.map((index) => {
                const stat = periodStats[index];

                if (!stat) {
                  return null;
                }

                const point = points[index];

                return (
                  <text
                    fill="#182B49"
                    fontSize="12"
                    fontWeight="700"
                    key={stat[0]}
                    textAnchor="middle"
                    x={point.x}
                    y="282"
                  >
                    {formatPeriodLabel(stat[0], groupByDay)}
                  </text>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center text-center">
            <p className="text-sm font-semibold text-[#182B49]">
              Pas encore de réservation sur cette période.
            </p>
          </div>
        )}
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

    return latestOrder ? getDateKey(latestOrder.createdAt).slice(0, 7) : "2026-05";
  });
  const monthOptions = useMemo(() => {
    const months = new Set(
      orders.map((order) => getDateKey(order.createdAt).slice(0, 7)),
    );

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
      order.paymentStatus === "paid" ? sum + order.consultation.price : sum,
    0,
  );
  const potentialRevenue = filteredOrders.reduce(
    (sum, order) => sum + order.consultation.price,
    0,
  );
  const productStats = products.map((product) => ({
    count: filteredOrders.filter((order) => order.consultationId === product.id)
      .length,
    id: product.id,
    title: product.title,
  }));
  const maxBookings = Math.max(1, ...productStats.map((product) => product.count));
  const groupByDay = Boolean(monthFilter || startDate || endDate);
  const periodStats = useMemo(() => {
    const buckets = new Map<string, number>();

    filteredOrders.forEach((order) => {
      const key = getDateKey(order.createdAt).slice(0, groupByDay ? 10 : 7);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });

    return Array.from(buckets.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(groupByDay ? -31 : -6);
  }, [filteredOrders, groupByDay]);
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
  const selectedPeriodLabel = monthFilter
    ? (monthOptions.find((month) => month.value === monthFilter)?.label ??
      monthFilter)
    : startDate && endDate
      ? startDate === endDate
        ? startDate
        : `${startDate} - ${endDate}`
      : "Tous les mois";

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
    handleMonthChange(getRelativeDateKey(0).slice(0, 7));
  };

  const handleToday = () => {
    const today = getRelativeDateKey(0);

    setEndDate(today);
    setMonthFilter("");
    setStartDate(today);
    setCalendarMonth(today.slice(0, 7));
  };

  const handlePreviousMonth = () => {
    const currentMonth = new Date(`${getRelativeDateKey(0).slice(0, 7)}-01T12:00:00`);
    currentMonth.setMonth(currentMonth.getMonth() - 1);

    handleMonthChange(getLocalDateKey(currentMonth).slice(0, 7));
  };

  const quickFilters = [
    { label: "Aujourd'hui", onClick: handleToday },
    { label: "7 jours", onClick: () => handlePresetRange(6) },
    { label: "30 jours", onClick: () => handlePresetRange(29) },
    { label: "Mois courant", onClick: handleCurrentMonth },
    { label: "Mois dernier", onClick: handlePreviousMonth },
  ];

  return (
    <div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
          Stats
        </p>
        <h1 className="mt-3 text-4xl font-semibold md:text-6xl">
          Tableau de bord
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-[#182B49]">
          Suis les réservations, les paiements et les statuts de commande sur
          la période que tu choisis.
        </p>
      </div>

      <section className="mt-8 rounded-lg border border-[#75C7E7] bg-[#F4F8FB] p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#425D78]">
              Filtres
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Période</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#75C7E7] bg-[#BCE8F5] px-4 py-2 text-sm font-bold text-[#182B49]">
              {selectedPeriodLabel}
            </span>
          <button
            className="min-h-10 rounded-full border border-[#75C7E7] px-4 text-sm font-bold text-[#182B49] transition hover:border-[#182B49] hover:bg-[#BCE8F5]"
            onClick={resetStatsFilters}
            type="button"
          >
              Réinitialiser
          </button>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <button
              className="min-h-10 rounded-full border border-[#75C7E7] bg-[#F4F8FB] px-4 text-sm font-bold text-[#182B49] transition hover:border-[#182B49] hover:bg-[#FFD35A]"
              key={filter.label}
              onClick={filter.onClick}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.62fr_1.38fr]">
          <div className="grid content-start gap-4 rounded-lg border border-[#75C7E7] bg-[#BCE8F5] p-4">
          <label className="grid gap-2 text-sm font-semibold">
            Mois
            <select
              className="min-h-12 rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 font-normal outline-none transition focus:border-[#182B49]"
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#425D78]">
                  Début
                </p>
                <p className="mt-2 text-sm font-bold text-[#182B49]">
                  {startDate || "-"}
                </p>
              </div>
              <div className="rounded-md border border-[#75C7E7] bg-[#F4F8FB] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#425D78]">
                  Fin
                </p>
                <p className="mt-2 text-sm font-bold text-[#182B49]">
                  {endDate || "-"}
                </p>
              </div>
            </div>
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
        <StatCard label="CA payé" value={`${paidRevenue} EUR`} />
        <StatCard label="CA potentiel" value={`${potentialRevenue} EUR`} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <ReservationsCurve groupByDay={groupByDay} periodStats={periodStats} />

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

  return (
    <div className="rounded-lg border border-[#75C7E7] bg-[#BCE8F5] p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#425D78]">
            Calendrier
          </p>
          <p className="mt-1 text-sm font-semibold capitalize text-[#182B49]">
            {getMonthTitle(calendarMonth)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            aria-label="Mois précédent"
            className="size-10 rounded-md border border-[#75C7E7] bg-[#F4F8FB] text-lg font-bold transition hover:border-[#182B49] hover:bg-[#FFD35A]"
            onClick={() => setCalendarMonth(shiftMonth(calendarMonth, -1))}
            type="button"
          >
            &lt;
          </button>
          <button
            aria-label="Mois suivant"
            className="size-10 rounded-md border border-[#75C7E7] bg-[#F4F8FB] text-lg font-bold transition hover:border-[#182B49] hover:bg-[#FFD35A]"
            onClick={() => setCalendarMonth(shiftMonth(calendarMonth, 1))}
            type="button"
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {weekDays.map((day) => (
          <span
            className="py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#182B49]"
            key={day}
          >
            {day}
          </span>
        ))}
        {days.map((day) => {
          const isStart = day.key === startDate;
          const isEnd = day.key === endDate;
          const isToday = day.key === todayKey;
          const isInRange =
            Boolean(startDate && rangeEnd) &&
            day.key >= startDate &&
            day.key <= rangeEnd;

          return (
            <button
              aria-pressed={isStart || isEnd || isInRange}
              className={`min-h-11 rounded-md border text-sm font-bold transition ${
                isStart || isEnd
                  ? "border-[#182B49] bg-[#182B49] text-[#F4F8FB]"
                : isInRange
                    ? "border-[#FFD35A] bg-[#FFD35A] text-[#182B49]"
                    : isToday
                      ? "border-[#FFD35A] bg-[#F4F8FB] text-[#182B49] ring-2 ring-[#FFD35A]"
                      : day.isCurrentMonth
                      ? "border-[#75C7E7] bg-[#F4F8FB] text-[#182B49] hover:border-[#182B49]"
                      : "border-[#BCE8F5] bg-[#BCE8F5] text-[#182B49]"
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
