"use client";

import { signIn } from "next-auth/react";

export default function LoginForm() {
  return (
    <button
      className="min-h-12 rounded-full bg-[#FFD35A] px-6 text-sm font-bold text-[#182B49] shadow-[0_18px_48px_rgba(255,211,90,0.25)] transition hover:bg-[#FFD35A]"
      onClick={() => signIn("discord", { callbackUrl: "/admin" })}
      type="button"
    >
      Connexion Discord
    </button>
  );
}
