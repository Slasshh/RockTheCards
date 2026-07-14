"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth-options";
import { Prisma } from "@/generated/prisma/client";
import {
  createGoogleOAuthClient,
  decryptGoogleRefreshToken,
  GOOGLE_CALENDAR_CONNECTION_ID,
} from "@/lib/google-calendar-oauth";
import { prisma } from "@/lib/prisma";
import {
  calculateDiscountedPriceCents,
  isValidPromotionCode,
  MIN_CHECKOUT_AMOUNT_CENTS,
  normalizePromotionCode,
} from "@/lib/promotion-pricing";

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    redirect("/login");
  }
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type IntegerFieldOptions = {
  defaultValue?: number;
  max?: number;
  min?: number;
  multipleOf?: number;
};

const customerFieldValues = new Set(["firstName", "name", "email", "phone"]);

function readString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function readIntegerField(
  formData: FormData,
  name: string,
  label: string,
  options: IntegerFieldOptions = {},
) {
  const rawValue = readString(formData, name);

  if (!rawValue && options.defaultValue !== undefined) {
    return options.defaultValue;
  }

  if (!/^-?\d+$/.test(rawValue)) {
    throw new Error(`${label} invalide`);
  }

  const value = Number(rawValue);

  if (
    !Number.isSafeInteger(value) ||
    (options.min !== undefined && value < options.min) ||
    (options.max !== undefined && value > options.max) ||
    (options.multipleOf !== undefined && value % options.multipleOf !== 0)
  ) {
    throw new Error(`${label} invalide`);
  }

  return value;
}

function readOptionalIntegerField(
  formData: FormData,
  name: string,
  label: string,
  options: Omit<IntegerFieldOptions, "defaultValue"> = {},
) {
  return readString(formData, name)
    ? readIntegerField(formData, name, label, options)
    : null;
}

function readDateField(formData: FormData, name: string, label: string) {
  const rawValue = readString(formData, name);
  const date = new Date(rawValue);

  if (!rawValue || Number.isNaN(date.getTime())) {
    throw new Error(`${label} invalide`);
  }

  return date;
}

function readIntegerFields(
  formData: FormData,
  name: string,
  label: string,
) {
  const values = formData
    .getAll(name)
    .map((value) => String(value).trim())
    .filter(Boolean);
  const ids = new Set<number>();

  for (const value of values) {
    if (!/^\d+$/.test(value)) {
      throw new Error(`${label} invalide`);
    }

    const id = Number(value);

    if (!Number.isSafeInteger(id) || id < 1) {
      throw new Error(`${label} invalide`);
    }

    ids.add(id);
  }

  return Array.from(ids);
}

function readCustomerFields(formData: FormData) {
  const values = formData
    .getAll("customerFields")
    .map((value) => String(value).trim())
    .filter(Boolean);

  for (const value of values) {
    if (!customerFieldValues.has(value)) {
      throw new Error("Champs client invalides");
    }
  }

  const uniqueValues = Array.from(new Set(values));

  return uniqueValues.length ? uniqueValues.join(",") : "name,email";
}

function readIntegerListField(
  formData: FormData,
  name: string,
  label: string,
  min: number,
  max: number,
) {
  const values = formData
    .getAll(name)
    .map((value) => String(value).trim())
    .filter(Boolean);
  const uniqueValues = new Set<string>();

  for (const value of values) {
    if (!/^\d+$/.test(value)) {
      throw new Error(`${label} invalide`);
    }

    const numberValue = Number(value);

    if (
      !Number.isSafeInteger(numberValue) ||
      numberValue < min ||
      numberValue > max
    ) {
      throw new Error(`${label} invalide`);
    }

    uniqueValues.add(String(numberValue));
  }

  return uniqueValues.size ? Array.from(uniqueValues).join(",") : null;
}

function readDisabledDaysByMonth(formData: FormData) {
  const values = formData
    .getAll("disabledDaysByMonth")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const uniqueValues = new Set<string>();

  for (const value of values) {
    const [monthValue, dayValue] = value.split(":");

    if (!/^\d+$/.test(monthValue ?? "") || !/^\d+$/.test(dayValue ?? "")) {
      throw new Error("Jours bloqués par mois invalides");
    }

    const month = Number(monthValue);
    const day = Number(dayValue);

    if (
      !Number.isSafeInteger(month) ||
      !Number.isSafeInteger(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      throw new Error("Jours bloqués par mois invalides");
    }

    uniqueValues.add(`${month}:${day}`);
  }

  return uniqueValues.size ? Array.from(uniqueValues).join(",") : null;
}

function readProductForm(formData: FormData) {
  const title = readString(formData, "title");
  const rawSlug = readString(formData, "slug");
  const summary = readString(formData, "summary");
  const imageUrl = readString(formData, "imageUrl");
  const focus = readString(formData, "focus");
  const badge = readString(formData, "badge");
  const unavailableText = readString(formData, "unavailableText");
  const customerFields = readCustomerFields(formData);
  const duration = readOptionalIntegerField(
    formData,
    "duration",
    "Durée",
    { min: 1 },
  );
  const price = readIntegerField(formData, "price", "Prix", { min: 1 });
  const sortOrder = readIntegerField(formData, "sortOrder", "Ordre", {
    defaultValue: 0,
  });
  const bookingDaysAhead = readIntegerField(
    formData,
    "bookingDaysAhead",
    "Jours réservables",
    { min: 1 },
  );
  const disabledWeekdays = readIntegerListField(
    formData,
    "disabledWeekdays",
    "Jours fermés",
    0,
    6,
  );
  const allowedMonths = readIntegerListField(
    formData,
    "allowedMonths",
    "Mois ouverts",
    1,
    12,
  );
  const disabledMonthDays = readIntegerListField(
    formData,
    "disabledMonthDays",
    "Jours bloqués",
    1,
    31,
  );
  const disabledDaysByMonth = readDisabledDaysByMonth(formData);
  const disableFrenchHolidays = formData.get("disableFrenchHolidays") === "on";
  const bookable = formData.get("bookable") === "on";
  const featured = formData.get("featured") === "on";
  const slug = slugify(rawSlug || title);

  if (
    !title ||
    !summary ||
    !focus ||
    !badge ||
    !slug
  ) {
    throw new Error("Produit incomplet");
  }

  return {
    badge,
    bookable,
    duration,
    featured,
    focus,
    imageUrl: imageUrl || null,
    price,
    bookingDaysAhead,
    allowedMonths,
    disabledDaysByMonth,
    disabledMonthDays,
    disableFrenchHolidays,
    disabledWeekdays,
    slug,
    sortOrder,
    summary,
    title,
    customerFields,
    unavailableText: unavailableText || null,
  };
}

function readPromotionForm(formData: FormData) {
  const code = normalizePromotionCode(readString(formData, "code"));
  const title = readString(formData, "title");
  const bannerText = readString(formData, "bannerText");
  const percentOff = readIntegerField(
    formData,
    "percentOff",
    "Réduction",
    { min: 1, max: 90 },
  );
  const startsAt = readDateField(formData, "startsAt", "Début");
  const endsAt = readDateField(formData, "endsAt", "Fin");
  const allProducts = formData.get("allProducts") === "on";
  const productIds = readIntegerFields(
    formData,
    "productIds",
    "Produits sélectionnés",
  );

  if (!isValidPromotionCode(code)) {
    throw new Error(
      "Le code doit contenir 3 à 32 lettres, chiffres, tirets ou underscores.",
    );
  }

  if (!title || title.length > 120) {
    throw new Error("Le titre de la promotion est invalide.");
  }

  if (!bannerText || bannerText.length > 191) {
    throw new Error("Le texte du bandeau est invalide.");
  }

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("La fin de la promotion doit être après son début.");
  }

  if (!allProducts && productIds.length === 0) {
    throw new Error("Sélectionne au moins un produit.");
  }

  return {
    active: formData.get("active") === "on",
    allProducts,
    bannerText,
    code,
    endsAt,
    percentOff,
    productIds: allProducts ? [] : productIds,
    startsAt,
    title,
  };
}

function revalidatePromotionPages() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/produits");
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function validatePromotionProducts(
  productIds: number[],
  allProducts: boolean,
  percentOff: number,
) {
  const products = await prisma.consultation.findMany({
    select: { id: true, price: true },
    where: allProducts ? {} : { id: { in: productIds } },
  });

  if (!allProducts && products.length !== productIds.length) {
    throw new Error("Un produit sélectionné n'existe plus.");
  }

  if (
    products.some(
      (product) =>
        calculateDiscountedPriceCents(product.price * 100, percentOff) <
        MIN_CHECKOUT_AMOUNT_CENTS,
    )
  ) {
    throw new Error(
      "La réduction fait passer un produit sous le minimum de paiement Stripe.",
    );
  }
}

export async function createPromotion(formData: FormData) {
  await requireAdmin();

  const promotion = readPromotionForm(formData);
  await validatePromotionProducts(
    promotion.productIds,
    promotion.allProducts,
    promotion.percentOff,
  );

  try {
    await prisma.promotion.create({
      data: {
        active: promotion.active,
        allProducts: promotion.allProducts,
        bannerText: promotion.bannerText,
        code: promotion.code,
        endsAt: promotion.endsAt,
        percentOff: promotion.percentOff,
        products: {
          create: promotion.productIds.map((consultationId) => ({
            consultationId,
          })),
        },
        startsAt: promotion.startsAt,
        title: promotion.title,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error("Ce code promotionnel existe déjà.");
    }

    throw error;
  }

  revalidatePromotionPages();
}

export async function updatePromotion(formData: FormData) {
  await requireAdmin();

  const id = readIntegerField(formData, "id", "Promotion", { min: 1 });
  const promotion = readPromotionForm(formData);
  await validatePromotionProducts(
    promotion.productIds,
    promotion.allProducts,
    promotion.percentOff,
  );

  try {
    await prisma.$transaction(async (tx) => {
      await tx.promotionConsultation.deleteMany({
        where: { promotionId: id },
      });
      await tx.promotion.update({
        data: {
          active: promotion.active,
          allProducts: promotion.allProducts,
          bannerText: promotion.bannerText,
          code: promotion.code,
          endsAt: promotion.endsAt,
          percentOff: promotion.percentOff,
          products: {
            create: promotion.productIds.map((consultationId) => ({
              consultationId,
            })),
          },
          startsAt: promotion.startsAt,
          title: promotion.title,
        },
        where: { id },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error("Ce code promotionnel existe déjà.");
    }

    throw error;
  }

  revalidatePromotionPages();
}

export async function deletePromotion(formData: FormData) {
  await requireAdmin();

  const id = readIntegerField(formData, "id", "Promotion", { min: 1 });

  await prisma.promotion.delete({ where: { id } });
  revalidatePromotionPages();
}

export async function createProduct(formData: FormData) {
  await requireAdmin();

  await prisma.consultation.create({
    data: readProductForm(formData),
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/produits");
}

export async function updateProduct(formData: FormData) {
  await requireAdmin();

  const id = readIntegerField(formData, "id", "Produit", { min: 1 });

  await prisma.consultation.update({
    data: readProductForm(formData),
    where: { id },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/produits");
}

export async function updateProductDatePicker(formData: FormData) {
  await requireAdmin();

  const id = readIntegerField(formData, "id", "Produit", { min: 1 });
  const bookingBufferMinutes = readIntegerField(
    formData,
    "bookingBufferMinutes",
    "Tampon entre réservations",
    { min: 0, multipleOf: 15 },
  );
  const bookingDaysAhead = readIntegerField(
    formData,
    "bookingDaysAhead",
    "Jours affichés",
    { min: 1 },
  );
  const slotDurationMinutes = readIntegerField(
    formData,
    "slotDurationMinutes",
    "Durée d'un créneau",
    { min: 15, multipleOf: 15 },
  );
  const disabledWeekdays = readIntegerListField(
    formData,
    "disabledWeekdays",
    "Jours fermés",
    0,
    6,
  );
  const allowedMonths = readIntegerListField(
    formData,
    "allowedMonths",
    "Mois ouverts",
    1,
    12,
  );
  const disabledMonthDays = readIntegerListField(
    formData,
    "disabledMonthDays",
    "Jours bloqués",
    1,
    31,
  );
  const disabledDaysByMonth = readDisabledDaysByMonth(formData);

  await prisma.consultation.update({
    data: {
      allowedMonths,
      allowSameDayBooking: formData.get("allowSameDayBooking") === "on",
      bookingDaysAhead,
      bookingBufferMinutes,
      disabledDaysByMonth,
      disabledMonthDays,
      disabledWeekdays,
      disableFrenchHolidays: formData.get("disableFrenchHolidays") === "on",
      slotDurationMinutes,
    },
    where: { id },
  });

  revalidatePath("/admin");
  revalidatePath("/produits");
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();

  const id = readIntegerField(formData, "id", "Produit", { min: 1 });

  await prisma.booking.deleteMany({
    where: { consultationId: id },
  });
  await prisma.consultation.delete({
    where: { id },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/produits");
}

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin();

  const id = readIntegerField(formData, "id", "Commande", { min: 1 });
  const orderStatus = String(formData.get("orderStatus") ?? "").trim();
  const allowedStatuses = new Set(["new", "confirmed", "done", "cancelled"]);

  if (!allowedStatuses.has(orderStatus)) {
    throw new Error("Statut de commande invalide");
  }

  await prisma.booking.update({
    data: { orderStatus },
    where: { id },
  });

  revalidatePath("/admin");
}

export async function disconnectGoogleCalendar() {
  await requireAdmin();

  const connection = await prisma.googleCalendarConnection.findUnique({
    select: { encryptedRefreshToken: true },
    where: { id: GOOGLE_CALENDAR_CONNECTION_ID },
  });

  if (connection) {
    try {
      const refreshToken = decryptGoogleRefreshToken(
        connection.encryptedRefreshToken,
      );
      await createGoogleOAuthClient().revokeToken(refreshToken);
    } catch (error) {
      console.error(
        "Google Calendar OAuth revocation failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    await prisma.googleCalendarConnection.delete({
      where: { id: GOOGLE_CALENDAR_CONNECTION_ID },
    });
  }

  revalidatePath("/admin");
  redirect("/admin?view=calendar&googleCalendar=disconnected");
}
