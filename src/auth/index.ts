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
import Session from '@/models/Session'; // ⬅️ kita bikin model Session mongoose
import { Adapter } from 'next-auth/adapters';

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

// --- Adapter custom untuk pakai mongoose Session ---
const MongooseAdapter: Adapter = {
  async createSession(session) {
    await dbConnect();
    const newSession = await Session.create(session);
    return {
      sessionToken: newSession.sessionToken,
      userId: newSession.userId,
      expires: newSession.expires,
    };
  },

  async getSessionAndUser(sessionToken) {
    await dbConnect();
    const session = await Session.findOne({ sessionToken });
    if (!session) return null;

    const user = await User.findById(session.userId);
    if (!user) return null;

    return {
      session: {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires,
      },
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        profilePictureUrl: user.profilePictureUrl,
      },
    };
  },

  async deleteSession(sessionToken) {
    await dbConnect();
    await Session.deleteOne({ sessionToken });
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,

  // ✅ Sekarang database strategy
  adapter: MongooseAdapter,
  session: {
    strategy: 'database',
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
    async session({ session, user }) {
      // karena pakai database strategy, user di sini sudah resolve dari adapter
      if (user) {
        session.user.id = user.id;
        session.user.walletAddress = user.walletAddress;
        session.user.username = user.username;
        session.user.profilePictureUrl = user.profilePictureUrl;
      }
      return session;
    },
  },
});
