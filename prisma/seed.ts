import { PrismaClient } from "../generated/prisma/client";
import { createMariaDbAdapter } from "../lib/mariadb-adapter";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: createMariaDbAdapter(databaseUrl),
});

const consultations = [
  {
    title: "Tirage Clarté",
    slug: "tirage-clarte",
    summary:
      "Une lecture courte pour éclairer une décision, comprendre une énergie du moment et repartir avec une piste nette.",
    imageUrl: "/card-spread.svg",
    duration: 25,
    price: 35,
    focus: "Décision, intuition, prochain pas",
    badge: "Express",
    featured: false,
    sortOrder: 1,
  },
  {
    title: "Guidance Amour",
    slug: "guidance-amour",
    summary:
      "Un espace doux pour regarder les dynamiques affectives, les blocages et les possibilités relationnelles.",
    imageUrl: "/card-spread.svg",
    duration: 45,
    price: 65,
    focus: "Relations, attachements, cycles",
    badge: "Populaire",
    featured: true,
    sortOrder: 2,
  },
  {
    title: "Boussole Pro",
    slug: "boussole-pro",
    summary:
      "Une consultation orientée carrière, projets et alignement professionnel, avec une lecture concrète des options.",
    imageUrl: "/card-spread.svg",
    duration: 50,
    price: 75,
    focus: "Carrière, mission, transition",
    badge: "Pro",
    featured: false,
    sortOrder: 3,
  },
  {
    title: "Grand Tirage Lunaire",
    slug: "grand-tirage-lunaire",
    summary:
      "Une séance complète pour traverser une période charnière, croiser plusieurs axes et poser un plan d'action.",
    imageUrl: "/card-spread.svg",
    duration: 75,
    price: 110,
    focus: "Cycle de vie, choix majeurs, ancrage",
    badge: "Premium",
    featured: false,
    sortOrder: 4,
  },
];

async function main() {
  for (const consultation of consultations) {
    await prisma.consultation.upsert({
      where: { slug: consultation.slug },
      update: consultation,
      create: consultation,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
