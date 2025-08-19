import { hashNonce } from '@/auth/wallet/client-helpers';
import {
  MiniAppWalletAuthSuccessPayload,
  MiniKit,
  verifySiweMessage,
} from '@worldcoin/minikit-js';
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

declare module 'next-auth' {
  interface User {
    id: string;
    walletAddress: string;
    username: string;
    profilePictureUrl: string;
  }

  interface Session {
    user: {
      id: string;
      walletAddress: string;
      username: string;
      profilePictureUrl: string;
    } & DefaultSession['user'];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,

  // ✅ Perubahan di sini (agar session tetap tersimpan)
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 hari
    updateAge: 24 * 60 * 60,   // refresh token tiap 1 hari
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 hari juga
  },

  providers: [
    Credentials({
      name: 'World App Wallet',
      credentials: {
        nonce: { label: 'Nonce', type: 'text' },
        signedNonce: { label: 'Signed Nonce', type: 'text' },
        finalPayloadJson: { label: 'Final Payload', type: 'text' },
      },
      authorize: async (credentials) => {
        const nonce = credentials?.nonce as string;
        const signedNonce = credentials?.signedNonce as string;
        const finalPayloadJson = credentials?.finalPayloadJson as string;

        const expectedSignedNonce = hashNonce({ nonce });

        if (signedNonce !== expectedSignedNonce) {
          console.log('Invalid signed nonce');
          return null;
        }

        let finalPayload: MiniAppWalletAuthSuccessPayload;
        try {
          finalPayload = JSON.parse(finalPayloadJson);
        } catch {
          console.log('Invalid JSON payload');
          return null;
        }

        const result = await verifySiweMessage(finalPayload, nonce);

        if (!result.isValid || !result.siweMessageData.address) {
          console.log('Invalid final payload');
          return null;
        }

        const walletAddress = finalPayload.address;

        await dbConnect();

        let user = await User.findOne({ walletAddress });

        if (!user) {
          const userInfo = await MiniKit.getUserInfo(walletAddress);

          user = await User.create({
            walletAddress,
            username: userInfo.username,
            profilePictureUrl: userInfo.profilePictureUrl,
          });
        }

        return {
          id: user._id.toString(),
          walletAddress: user.walletAddress,
          username: user.username,
          profilePictureUrl: user.profilePictureUrl,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }

      if (token.userId) {
        await dbConnect();
        const dbUser = await User.findById(token.userId);

        if (dbUser) {
          token.walletAddress = dbUser.walletAddress;
          token.username = dbUser.username;
          token.profilePictureUrl = dbUser.profilePictureUrl;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
        session.user.walletAddress = token.walletAddress as string;
        session.user.username = token.username as string;
        session.user.profilePictureUrl = token.profilePictureUrl as string;
      }

      return session;
    },
  },
});