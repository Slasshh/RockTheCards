import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth-options";
import {
  decryptGoogleRefreshToken,
  getGoogleOAuthConfigurationStatus,
  GOOGLE_CALENDAR_CONNECTION_ID,
} from "@/lib/google-calendar-oauth";
import { prisma } from "@/lib/prisma";
import AdminDashboard from "./admin-dashboard";
import {
  createPromotion,
  createProduct,
  deletePromotion,
  deleteProduct,
  disconnectGoogleCalendar,
  updateProduct,
  updateProductDatePicker,
  updateOrderStatus,
  updatePromotion,
} from "./actions";

type AdminPageProps = {
  searchParams: Promise<{
    googleCalendar?: string | string[];
    view?: string | string[];
  }>;
};

function readSingleSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

function readInitialView(value: string | null) {
  switch (value) {
    case "calendar":
    case "datePicker":
    case "orders":
    case "promotions":
    case "products":
    case "stats":
      return value;
    default:
      return "products";
  }
}

function readGoogleCalendarNotice(value: string | null) {
  switch (value) {
    case "connected":
    case "disconnected":
    case "error":
    case "scope":
      return value;
    default:
      return null;
  }
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    redirect("/login");
  }

  const [
    products,
    orders,
    promotions,
    googleCalendarConnection,
    resolvedSearchParams,
  ] = await Promise.all([
      prisma.consultation.findMany({
        include: {
          _count: {
            select: { bookings: true },
          },
          bookings: {
            orderBy: { createdAt: "asc" },
            select: {
              createdAt: true,
              preferredDate: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.booking.findMany({
        include: {
          consultation: {
            select: {
              title: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.promotion.findMany({
        include: {
          _count: {
            select: { bookings: true },
          },
          products: {
            select: { consultationId: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.googleCalendarConnection.findUnique({
        select: {
          encryptedRefreshToken: true,
          googleEmail: true,
          updatedAt: true,
        },
        where: { id: GOOGLE_CALENDAR_CONNECTION_ID },
      }),
      searchParams,
    ]);
  const googleOAuthConfiguration = getGoogleOAuthConfigurationStatus();
  let googleTokenReadable = false;

  if (googleCalendarConnection) {
    try {
      decryptGoogleRefreshToken(
        googleCalendarConnection.encryptedRefreshToken,
      );
      googleTokenReadable = true;
    } catch {
      googleTokenReadable = false;
    }
  }

  return (
    <AdminDashboard
      createPromotion={createPromotion}
      createProduct={createProduct}
      deletePromotion={deletePromotion}
      deleteProduct={deleteProduct}
      disconnectGoogleCalendar={disconnectGoogleCalendar}
      googleCalendarNotice={readGoogleCalendarNotice(
        readSingleSearchParam(resolvedSearchParams.googleCalendar),
      )}
      googleCalendarStatus={{
        configurationReady: googleOAuthConfiguration.ready,
        connected: Boolean(googleCalendarConnection && googleTokenReadable),
        email: googleCalendarConnection?.googleEmail ?? null,
        needsReconnect: Boolean(
          googleCalendarConnection && !googleTokenReadable,
        ),
        redirectUri: googleOAuthConfiguration.redirectUri,
        updatedAt: googleCalendarConnection?.updatedAt.toISOString() ?? null,
      }}
      initialView={readInitialView(
        readSingleSearchParam(resolvedSearchParams.view),
      )}
      products={products.map((product) => ({
        ...product,
        bookings: product.bookings.map((booking) => ({
          ...booking,
          createdAt: booking.createdAt.toISOString(),
          preferredDate: booking.preferredDate?.toISOString() ?? null,
        })),
        createdAt: product.createdAt.toISOString(),
      }))}
      orders={orders.map((order) => ({
        ...order,
        createdAt: order.createdAt.toISOString(),
        preferredDate: order.preferredDate?.toISOString() ?? null,
      }))}
      promotions={promotions.map(({ products: promotionProducts, ...promotion }) => ({
        ...promotion,
        createdAt: promotion.createdAt.toISOString(),
        endsAt: promotion.endsAt.toISOString(),
        productIds: promotionProducts.map((product) => product.consultationId),
        startsAt: promotion.startsAt.toISOString(),
        updatedAt: promotion.updatedAt.toISOString(),
      }))}
      updateOrderStatus={updateOrderStatus}
      updatePromotion={updatePromotion}
      updateProductDatePicker={updateProductDatePicker}
      updateProduct={updateProduct}
      userLabel={session.user?.name ?? session.user?.email ?? "Admin Discord"}
    />
  );
}
