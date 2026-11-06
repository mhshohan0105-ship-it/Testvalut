import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|twitter-image|.*\\.(?:png|jpg|jpeg|webp|svg|ico)$).*)"],
};
