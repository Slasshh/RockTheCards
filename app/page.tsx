import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import type { CSSProperties } from "react";
import HomeNavbar from "@/app/home-navbar";

type YouTubeVideo = {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
};

type YouTubeSearchItem = {
  id?: {
    videoId?: string;
  };
  snippet?: {
    title?: string;
    thumbnails?: {
      default?: { url?: string };
      medium?: { url?: string };
      high?: { url?: string };
    };
  };
};

type YouTubeSearchResponse = {
  items?: YouTubeSearchItem[];
};

const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@unmessagedelunivers";
const YOUTUBE_VIDEOS_URL = `${YOUTUBE_CHANNEL_URL}/videos`;
const YOUTUBE_SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_CACHE_SECONDS = 21600;
const YOUTUBE_FALLBACK_VIDEOS: YouTubeVideo[] = Array.from(
  { length: 5 },
  (_, index) => ({
    id: `fallback-${index + 1}`,
    title: `Dernière vidéo ${index + 1}`,
    url: YOUTUBE_VIDEOS_URL,
    thumbnail: "",
  }),
);

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .trim();
}

function getYouTubeSearchUrl(channelId: string, apiKey: string) {
  const url = new URL(YOUTUBE_SEARCH_ENDPOINT);

  url.search = new URLSearchParams({
    part: "snippet",
    channelId,
    key: apiKey,
    maxResults: "5",
    order: "date",
    type: "video",
  }).toString();

  return url;
}

const getCachedYouTubeVideos = unstable_cache(
  async (channelId: string, apiKey: string): Promise<YouTubeVideo[]> => {
    try {
      const response = await fetch(getYouTubeSearchUrl(channelId, apiKey), {
        cache: "force-cache",
        next: {
          revalidate: YOUTUBE_CACHE_SECONDS,
          tags: ["youtube-latest-videos"],
        },
      });

      if (!response.ok) {
        return YOUTUBE_FALLBACK_VIDEOS;
      }

      const data = (await response.json()) as YouTubeSearchResponse;

      const videos =
        data.items?.flatMap((item) => {
          const id = item.id?.videoId;

          if (!id) {
            return [];
          }

          return {
            id,
            title: decodeHtml(item.snippet?.title ?? "Vidéo YouTube"),
            url: `https://www.youtube.com/watch?v=${id}`,
            thumbnail:
              item.snippet?.thumbnails?.high?.url ??
              item.snippet?.thumbnails?.medium?.url ??
              item.snippet?.thumbnails?.default?.url ??
              `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          };
        }) ?? [];

      return videos.length > 0 ? videos : YOUTUBE_FALLBACK_VIDEOS;
    } catch {
      return YOUTUBE_FALLBACK_VIDEOS;
    }
  },
  ["youtube-latest-videos"],
  { revalidate: YOUTUBE_CACHE_SECONDS, tags: ["youtube-latest-videos"] },
);

async function getLatestYouTubeVideos(): Promise<YouTubeVideo[]> {
  const channelId = process.env.ROCKTHECARDS_YOUTUBE_CHANNEL_ID?.trim();
  const apiKey = process.env.ROCKTHECARDS_YOUTUBE_API_KEY?.trim();

  if (!channelId || !apiKey) {
    return YOUTUBE_FALLBACK_VIDEOS;
  }

  return getCachedYouTubeVideos(channelId, apiKey);
}

export default async function Home() {
  const youtubeVideos = await getLatestYouTubeVideos();
  const carouselVideos = [...youtubeVideos, ...youtubeVideos];

  return (
    <main className="min-h-screen bg-[#F4F8FB] text-[#182B49]">
      <section className="relative overflow-hidden bg-[#182B49] text-[#F4F8FB]">
        <div className="home-star home-star-a" aria-hidden="true" />
        <div className="home-star home-star-b" aria-hidden="true" />
        <div className="home-star home-star-c" aria-hidden="true" />
        <div className="home-star home-star-d" aria-hidden="true" />
        <HomeNavbar />

        <div className="relative z-10 mx-auto grid min-h-[92vh] max-w-7xl grid-cols-1 gap-10 px-5 pb-20 pt-28 md:grid-cols-[1fr_0.92fr] md:px-8 md:pt-32 lg:px-10">

          <div className="home-reveal flex flex-col justify-center pb-6 pt-8">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.28em] text-[#FFD35A]">
              Voyance privée & tarot intuitif
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] text-balance md:text-7xl">
              Des consultations claires pour les moments où tout bouge.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#BCE8F5]">
              Une boutique de guidances simples à réserver : tu choisis le
              produit, tu prends une date, et le site bloque les horaires déjà
              pris.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-[#FFD35A] px-6 py-3 text-sm font-bold text-[#182B49] shadow-[0_18px_48px_rgba(255,211,90,0.25)] transition hover:bg-[#FFD35A]"
                href="/produits"
              >
                Voir les produits
              </Link>
              <a
                className="rounded-full border border-[#F4F8FB]/25 px-6 py-3 text-sm font-bold text-[#F4F8FB] transition hover:border-[#FFD35A]"
                href="#methode"
              >
                Comprendre la méthode
              </a>
            </div>
          </div>

          <div className="flex items-center">
            <div className="home-card-stage">
              <div className="home-card-shadow" />
              <div className="home-tarot-card home-tarot-card-left">
                <div className="home-tarot-face" />
                <div className="home-tarot-sun" />
              </div>
              <div className="home-tarot-card home-tarot-card-main">
                <div className="home-tarot-face" />
                <div className="home-tarot-sun home-tarot-sun-main" />
              </div>
              <div className="home-tarot-card home-tarot-card-right">
                <div className="home-tarot-face" />
                <div className="home-tarot-sun" />
              </div>
              <div className="home-thought-bubble absolute bottom-2 right-3 max-w-[230px] rounded-[28px] border border-[#FFD35A]/30 bg-[#F4F8FB]/94 px-5 py-4 text-[#182B49] shadow-xl shadow-[#182B49]/20">
                <span className="home-thought-dot home-thought-dot-a" />
                <span className="home-thought-dot home-thought-dot-b" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#182B49]">
                  Pensée du tirage
                </p>
                <p className="mt-2 text-sm font-semibold leading-5">
                  Et si la réponse était déjà en train de se montrer ?
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="home-hero-bridge" aria-hidden="true" />
      </section>

      <section
        id="apropos"
        className="overflow-hidden bg-[#F4F8FB] px-5 pb-16 pt-14 md:px-8 md:pt-16 lg:px-10"
      >
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
          <div className="home-reveal">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
              À propos
            </p>
            <h2 className="mt-3 text-4xl font-semibold md:text-5xl">
              Martine, une voix intuitive derrière RockTheCards.
            </h2>
            <Link
              className="mt-7 inline-flex items-center gap-3 rounded-full border border-[#75C7E7] bg-[#75C7E7] px-4 py-3 text-sm font-bold text-[#182B49] transition hover:border-[#182B49]"
              href="/produits"
            >
              <Image
                alt="Logo RockTheCards"
                className="size-10 rounded-full"
                height={40}
                src="/logo.png"
                width={40}
              />
              Découvrir les tirages
            </Link>
          </div>
          <div className="about-text rounded-lg border border-[#75C7E7]/70 bg-white/75 p-6 shadow-sm md:p-8">
            <p className="about-text-line text-lg leading-8 text-[#182B49]">
              Depuis plus de 20 ans, je tire les cartes, une passion qui me
              guide et m&apos;inspire chaque jour. Moi, c&apos;est Martine, et
              ce site est le prolongement naturel de ma chaîne YouTube
              « Un message de l&apos;univers », où je partage régulièrement des
              vidéos dédiées à chaque signe astrologique.
            </p>
            <p className="about-text-line about-text-line-delay mt-5 text-lg leading-8 text-[#182B49]">
              Mon objectif est de vous offrir des éclairages et des messages
              porteurs de sens, toujours dans une démarche bienveillante et
              inspirante. Merci de me rejoindre dans cet univers qui me tient
              tant à cœur.
            </p>
          </div>
        </div>
      </section>

      <section
        id="methode"
        className="home-process-section home-reveal px-5 py-20 md:px-8 lg:px-10"
      >
        <div className="home-process-star home-process-star-a" aria-hidden="true" />
        <div className="home-process-star home-process-star-b" aria-hidden="true" />
        <div className="home-process-star home-process-star-c" aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.64fr_1.36fr] lg:items-center">
          <div className="relative z-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#75C7E7]">
              Parcours
            </p>
            <h2 className="mt-3 max-w-xl text-4xl font-semibold leading-tight text-[#F4F8FB] md:text-5xl">
              Une guidance réservée simplement, au bon moment.
            </h2>
            <p className="mt-5 max-w-xl leading-7 text-[#BCE8F5]">
              Tu choisis le tirage qui correspond à ta situation, tu poses ton
              intention, puis tu réserves un créneau disponible pour recevoir
              une lecture préparée avec soin.
            </p>
            <Link
              className="mt-8 inline-flex rounded-full bg-[#FFD35A] px-6 py-3 text-sm font-bold text-[#182B49] shadow-[0_18px_44px_rgba(255,211,90,0.24)] transition hover:-translate-y-0.5 hover:bg-[#FFE184]"
              href="/produits"
            >
              Choisir mon tirage
            </Link>
          </div>

          <div className="home-process-carousel" aria-label="Étapes de réservation">
            {[
              [
                "1",
                "Choisir ton thème",
                "Sentimental, professionnel, financier ou personnel : tu sélectionnes le tirage adapté à ta situation.",
              ],
              [
                "2",
                "Poser ta question",
                "Ton message donne le contexte essentiel pour orienter la lecture sans perdre ton fil.",
              ],
              [
                "3",
                "Confirmer le moment",
                "Tu sélectionnes un horaire disponible et la réservation se confirme après paiement.",
              ],
            ].map(([number, title, text], index) => (
              <article
                className="home-process-card"
                key={number}
                style={{ "--step-delay": `${index * 120}ms` } as CSSProperties}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
                  Étape {number}
                </p>
                <h3 className="mt-4 text-2xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#182B49]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="infos" className="bg-[#F4F8FB] px-5 py-20 md:px-8 lg:px-10">
        <div className="home-reveal mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#182B49]">
              Pour commencer
            </p>
            <h2 className="mt-3 text-4xl font-semibold md:text-5xl">
              Un espace simple pour poser ta question et choisir ton moment.
            </h2>
            </div>
            <p className="max-w-xl leading-7 text-[#425D78] lg:justify-self-end">
              Chaque étape reste lisible, de la sélection du tirage jusqu&apos;au
              message transmis pour préparer la consultation.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              [
                "Choisir le bon tirage",
                "Chaque consultation présente clairement son intention, sa durée et ce qu'elle peut t'apporter.",
              ],
              [
                "Réserver sans pression",
                "Tu sélectionnes un créneau disponible, puis tu confirmes uniquement si tout te convient.",
              ],
              [
                "Garder ton message au centre",
                "Ta demande est transmise avec ton contexte pour préparer une guidance plus précise.",
              ],
            ].map(([title, text], index) => (
              <article
                className="home-info-card"
                key={title}
                style={{ "--step-delay": `${index * 110}ms` } as CSSProperties}
              >
                <span className="mb-7 block h-1 w-12 rounded-full bg-[#FFD35A]" />
                <h3 className="text-2xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#182B49]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="videos"
        className="home-video-section px-5 py-20 text-[#F4F8FB] md:px-8 lg:px-10"
      >
        <div className="home-video-star home-video-star-a" aria-hidden="true" />
        <div className="home-video-star home-video-star-b" aria-hidden="true" />
        <div className="home-video-star home-video-star-c" aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#FFD35A]">
              Vidéos
            </p>
            <h2 className="mt-3 text-4xl font-semibold md:text-5xl">
              Les 5 dernières vidéos de la chaîne.
            </h2>
            <p className="mt-5 max-w-xl leading-7 text-[#BCE8F5]">
              Retrouve les dernières publications de la chaîne Un message de
              l&apos;univers, mises en avant dans un carousel automatique.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="rounded-full bg-[#FFD35A] px-6 py-3 text-sm font-bold text-[#182B49] transition hover:bg-[#FFD35A]"
                href={youtubeVideos[0]?.url ?? YOUTUBE_VIDEOS_URL}
                rel="noreferrer"
                target="_blank"
              >
                Voir la dernière vidéo
              </a>
              <a
                className="rounded-full border border-[#F4F8FB]/20 px-6 py-3 text-sm font-bold text-[#F4F8FB] transition hover:border-[#FFD35A]"
                href={YOUTUBE_CHANNEL_URL}
                rel="noreferrer"
                target="_blank"
              >
                Ouvrir la chaîne
              </a>
            </div>
          </div>

          <div className="home-video-carousel lg:col-span-2" aria-label="Dernières vidéos YouTube">
            <div className="home-video-track">
              {carouselVideos.map((video, index) => (
                <a
                  className="home-video-card group"
                  href={video.url}
                  key={`${video.id}-${index}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div className="home-video-thumb">
                    {video.thumbnail ? (
                      <Image
                        alt=""
                        className="object-cover transition duration-500 group-hover:scale-105"
                        fill
                        sizes="(max-width: 768px) 78vw, 320px"
                        src={video.thumbnail}
                        unoptimized
                      />
                    ) : (
                      <div className="home-video-thumb-fallback" />
                    )}
                    <span className="home-video-play" aria-hidden="true">
                      <span />
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFD35A]">
                      YouTube
                    </p>
                    <h3 className="mt-3 line-clamp-2 text-xl font-semibold leading-snug">
                      {video.title}
                    </h3>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="home-footer px-5 pb-8 pt-16 text-[#F4F8FB] md:px-8 lg:px-10">
        <div className="home-footer-star home-footer-star-a" aria-hidden="true" />
        <div className="home-footer-star home-footer-star-b" aria-hidden="true" />
        <div className="home-footer-star home-footer-star-c" aria-hidden="true" />
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <Link className="inline-flex items-center gap-3" href="/">
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
              <p className="mt-5 max-w-md text-sm leading-7 text-[#BCE8F5]">
                Consultations, tirages et guidances à réserver simplement, avec
                une approche claire et bienveillante.
              </p>
              <Link
                className="mt-7 inline-flex rounded-full bg-[#FFD35A] px-6 py-3 text-sm font-bold text-[#182B49] shadow-[0_18px_44px_rgba(255,211,90,0.2)] transition hover:-translate-y-0.5 hover:bg-[#FFE184]"
                href="/produits"
              >
                Réserver une guidance
              </Link>
            </div>

            <nav aria-label="Navigation footer">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#FFD35A]">
                Navigation
              </p>
              <div className="mt-5 grid gap-3 text-sm font-semibold text-[#BCE8F5]">
                <Link className="home-footer-link" href="/produits">
                  Produits
                </Link>
                <a className="home-footer-link" href="#methode">
                  Méthode
                </a>
                <a className="home-footer-link" href="#apropos">
                  À propos
                </a>
                <a className="home-footer-link" href="#videos">
                  Vidéos
                </a>
              </div>
            </nav>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#FFD35A]">
                Suivre
              </p>
              <div className="mt-5 grid gap-3 text-sm font-semibold text-[#BCE8F5]">
                <a
                  className="home-footer-link"
                  href={YOUTUBE_CHANNEL_URL}
                  rel="noreferrer"
                  target="_blank"
                >
                  YouTube
                </a>
                <a className="home-footer-link" href="mailto:contact@rockthecards.com">
                  Contact
                </a>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col justify-between gap-4 border-t border-[#F4F8FB]/10 pt-6 text-xs font-semibold text-[#BCE8F5] md:flex-row md:items-center">
            <p>© 2026 RockTheCards. Tous droits réservés.</p>
            <p>Guidance intuitive, réservation en ligne et messages YouTube.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
