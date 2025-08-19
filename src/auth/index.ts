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
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from '@/lib/mongodb-client';

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

  // 🔑 simpan session di MongoDB
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "database", // ganti dari jwt → database
    maxAge: 30 * 24 * 60 * 60, // 30 hari
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
        if (signedNonce !== expectedSignedNonce) return null;

        let finalPayload: MiniAppWalletAuthSuccessPayload;
        try {
          finalPayload = JSON.parse(finalPayloadJson);
        } catch {
          return null;
        }

        const result = await verifySiweMessage(finalPayload, nonce);
        if (!result.isValid || !result.siweMessageData.address) return null;

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
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
        session.user.walletAddress = user.walletAddress;
        session.user.username = user.username;
        session.user.profilePictureUrl = user.profilePictureUrl;
      }
      return session;
    },
  },
});
