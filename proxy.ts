import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const url = req.nextUrl;
  const pathname = url.pathname;

  if (pathname.startsWith("/icons/booking/")) {
    url.pathname = pathname.replace("/icons/booking/", "/booking/");
    return NextResponse.rewrite(url);
  }
  if (pathname.startsWith("/icons/admin/")) {
    url.pathname = pathname.replace("/icons/admin/", "/admin/");
    return NextResponse.rewrite(url);
  }

  if (host.includes("localhost")) {
    const isProtectedApi = pathname.startsWith("/api/admin/") || (pathname === "/api/bookings" && req.method === "GET");
    if (isProtectedApi) {
      const session = req.cookies.get("admin_session");
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (host.includes("admin.")) {
    if (pathname === "/" || pathname === "") {
      url.pathname = "/admin";
      return NextResponse.rewrite(url);
    }
    const allowed = ["/admin", "/api", "/_next", "/static", "/logo.png", "/login"].some((p) => pathname === p || pathname.startsWith(p));
    if (!allowed) {
      url.pathname = "/admin";
      return NextResponse.rewrite(url);
    }
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin") || (pathname === "/api/bookings" && req.method === "GET")) {
      const session = req.cookies.get("admin_session");
      if (!session) {
        if (pathname.startsWith("/admin")) {
          const loginUrl = url.clone();
          loginUrl.pathname = "/admin/intro";
          return NextResponse.redirect(loginUrl);
        }
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    return NextResponse.next();
  }

  if (host.includes("termin.")) {
    if (pathname.startsWith("/admin") || pathname.startsWith("/login")) {
      const rootUrl = url.clone();
      rootUrl.pathname = "/";
      return NextResponse.redirect(rootUrl);
    }
    if (pathname.startsWith("/api/admin/") || (pathname === "/api/bookings" && req.method === "GET")) {
      const session = req.cookies.get("admin_session");
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
