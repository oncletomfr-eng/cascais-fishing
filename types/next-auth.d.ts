import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "PARTICIPANT" | "CAPTAIN" | "ADMIN"
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: "PARTICIPANT" | "CAPTAIN" | "ADMIN"
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: "PARTICIPANT" | "CAPTAIN" | "ADMIN"
  }
}
