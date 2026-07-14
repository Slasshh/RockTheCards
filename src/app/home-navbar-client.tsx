"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type NavbarUser = {
  image: string | null;
  isAdmin: boolean;
  name: string;
};

type HomeNavbarClientProps = {
  hasPromotion: boolean;
  user: NavbarUser | null;
};

export default function HomeNavbarClient({
  hasPromotion,
  user,
}: HomeNavbarClientProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;

    const updateNavbar = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 24);
      });
    };

    updateNavbar();
    window.addEventListener("scroll", updateNavbar, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateNavbar);
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const closeMenu = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  return (
    <header
      className={`home-navbar fixed inset-x-0 top-0 z-50 px-5 py-3 md:px-8 lg:px-10 ${
        isScrolled ? "home-navbar-scrolled" : ""
      } ${hasPromotion ? "home-navbar-with-promotion" : ""}`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link className="flex min-w-0 items-center gap-3" href="/">
          <Image
            alt="Logo RockTheCards"
            className="home-navbar-logo size-11 rounded-full"
            height={44}
            src="/logo.png"
            width={44}
          />
          <span className="home-navbar-brand hidden text-lg font-semibold tracking-[0.22em] sm:inline">
            RockTheCards
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-[#BCE8F5] md:flex">
          <Link href="/produits">Produits</Link>
          <Link href="/#apropos">À propos</Link>
          <Link href="/#methode">Méthode</Link>
          <Link href="/#videos">Vidéos</Link>
          <Link href="/#infos">Infos</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            className="home-navbar-cta rounded-full border border-[#FFD35A] px-4 py-2 text-sm font-semibold text-[#FFD35A] transition hover:bg-[#FFD35A] hover:text-[#182B49]"
            href="/produits"
          >
            Consultation
          </Link>
          {user ? (
            <div className="home-navbar-profile" ref={menuRef}>
              <button
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
                aria-label="Ouvrir le menu du compte"
                className="home-navbar-avatar"
                onClick={() => setIsMenuOpen((current) => !current)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="home-navbar-avatar-image"
                  style={{
                    backgroundImage: `url(${user.image || "/logo.png"})`,
                  }}
                />
              </button>
              {isMenuOpen ? (
                <div className="home-navbar-menu" role="menu">
                  <div className="border-b border-[#75C7E7]/18 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFD35A]">
                      Connecté
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-[#F4F8FB]">
                      {user.name}
                    </p>
                  </div>
                  {user.isAdmin ? (
                    <Link
                      className="home-navbar-menu-item"
                      href="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      role="menuitem"
                    >
                      Panel admin
                    </Link>
                  ) : null}
                  <button
                    className="home-navbar-menu-item text-left"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    role="menuitem"
                    type="button"
                  >
                    Déconnexion
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
