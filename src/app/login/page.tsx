import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth-options";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.isAdmin) {
    redirect("/admin");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#182B49] px-5 text-[#F4F8FB]">
      <section className="w-full max-w-md rounded-lg border border-[#FFD35A]/45 bg-[#182B49] p-6 shadow-2xl shadow-[#182B49]/30">
        <Link className="flex items-center gap-3" href="/">
          <Image
            alt="Logo RockTheCards"
            className="size-11 rounded-full"
            height={44}
            src="/logo.png"
            width={44}
          />
          <span className="text-lg font-semibold tracking-[0.18em]">
            RockTheCards
          </span>
        </Link>

        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.24em] text-[#FFD35A]">
          Admin
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Connexion</h1>
        <p className="mt-4 leading-7 text-[#BCE8F5]">
          Connecte-toi avec Discord pour accéder au panel de gestion des
          produits.
        </p>

        <div className="mt-7">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
