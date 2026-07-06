import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, account, profile }) {
      const discordProfile = profile as { id?: string } | undefined;

      if (account?.provider === "discord" && discordProfile?.id) {
        token.discordId = discordProfile.id;
      }

      return token;
    },
    session({ session, token }) {
      const discordId =
        typeof token.discordId === "string" ? token.discordId : undefined;

      if (session.user) {
        session.user.id = discordId;
        session.user.isAdmin =
          Boolean(discordId) && discordId === process.env.DISCORD_ADMIN_ID;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
