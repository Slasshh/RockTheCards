import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth-options";
import { prisma } from "@/lib/prisma";
import AdminDashboard from "./admin-dashboard";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  updateProductDatePicker,
  updateOrderStatus,
} from "./actions";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    redirect("/login");
  }

  const products = await prisma.consultation.findMany({
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
  });
  const orders = await prisma.booking.findMany({
    include: {
      consultation: {
        select: {
          price: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminDashboard
      createProduct={createProduct}
      deleteProduct={deleteProduct}
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
      updateOrderStatus={updateOrderStatus}
      updateProductDatePicker={updateProductDatePicker}
      updateProduct={updateProduct}
      userLabel={session.user?.name ?? session.user?.email ?? "Admin Discord"}
    />
  );
}
