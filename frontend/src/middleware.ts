export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/((?!login|signup|api/auth|_next|favicon.ico).*)"],
};