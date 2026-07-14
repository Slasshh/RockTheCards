import { formatPhoneNumberForDiscord } from "@/lib/phone-number";
import { formatPriceFromCents } from "@/lib/promotion-pricing";

type OrderWebhookPayload = {
  bookingId: number;
  checkoutUrl?: string;
  consultationTitle: string;
  email: string | null;
  firstName?: string | null;
  message: string;
  name: string | null;
  phone?: string | null;
  paymentStatus?: string;
  preferredDate: Date | null;
  priceCents: number;
  promotionCode?: string | null;
  title?: string;
};

function splitDiscordText(value: string, limit = 1000) {
  const chunks: string[] = [];
  let remaining = value.trim();

  while (remaining.length > limit) {
    const splitAt = Math.max(
      remaining.lastIndexOf("\n", limit),
      remaining.lastIndexOf(" ", limit),
    );
    const end = splitAt > limit * 0.45 ? splitAt : limit;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks.length ? chunks : ["Aucun message."];
}

export async function sendOrderDiscordLog(payload: OrderWebhookPayload) {
  const webhookUrl = process.env.DISCORD_ORDER_WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  const messageChunks = splitDiscordText(payload.message);
  const formattedDate = payload.preferredDate
    ? payload.preferredDate.toLocaleString("fr-FR", {
        dateStyle: "full",
        timeStyle: "short",
      })
    : "Sans créneau";
  const baseFields = [
    {
      inline: true,
      name: "Commande",
      value: `#${payload.bookingId}`,
    },
    {
      inline: true,
      name: "Produit",
      value: payload.consultationTitle,
    },
    {
      inline: true,
      name: "Montant",
      value: formatPriceFromCents(payload.priceCents),
    },
    ...(payload.promotionCode
      ? [
          {
            inline: true,
            name: "Code promo",
            value: payload.promotionCode,
          },
        ]
      : []),
    {
      inline: true,
      name: "Client",
      value:
        [payload.firstName, payload.name].filter(Boolean).join(" ") ||
        "Non renseigné",
    },
    {
      inline: true,
      name: "Email",
      value: payload.email || "Non renseigné",
    },
    {
      inline: true,
      name: "Téléphone",
      value: payload.phone
        ? formatPhoneNumberForDiscord(payload.phone)
        : "Non renseigné",
    },
    {
      inline: true,
      name: "Créneau",
      value: formattedDate,
    },
  ];
  const embeds = messageChunks.map((chunk, index) => ({
    color: payload.paymentStatus === "paid" ? 0x6f8f63 : 0xd9b86f,
    description:
      index === 0
        ? "Une nouvelle demande de consultation vient d'être confirmée."
        : undefined,
    fields:
      index === 0
        ? [
            ...baseFields,
            {
              inline: true,
              name: "Paiement",
              value: payload.paymentStatus ?? "pending",
            },
            {
              name:
                messageChunks.length > 1
                  ? `Message (${index + 1}/${messageChunks.length})`
                  : "Message",
              value: chunk,
            },
          ]
        : [
            {
              name: `Message (${index + 1}/${messageChunks.length})`,
              value: chunk,
            },
          ],
    footer: {
      text: "RockTheCards",
    },
    timestamp: new Date().toISOString(),
    title:
      index === 0
        ? (payload.title ?? "Commande payée")
        : "Suite du message client",
  }));

  for (let index = 0; index < embeds.length; index += 10) {
    const response = await fetch(webhookUrl, {
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        embeds: embeds.slice(index, index + 10),
        username: "RockTheCards",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed with status ${response.status}.`);
    }
  }
}
