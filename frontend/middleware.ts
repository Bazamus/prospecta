export { default } from "next-auth/middleware"

// Protege todas las rutas del dashboard
// La ruta /login queda excluida al no coincidir con el matcher
export const config = {
  matcher: [
    "/",
    "/prospects/:path*",
    "/campaigns/:path*",
    "/messages/:path*",
    "/templates/:path*",
  ],
}
