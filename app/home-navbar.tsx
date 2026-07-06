import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";
import HomeNavbarClient from "@/app/home-navbar-client";

export default async function HomeNavbar() {
  const session = await getServerSession(authOptions);

  return (
    <HomeNavbarClient
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
  );
}
