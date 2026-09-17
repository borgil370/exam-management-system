import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "token";

// 与 server/.env 里的 JWT_SECRET 保持一致（读取自根目录 .env.local）
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

async function getRole(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const role = await getRole(request);
  const path = request.nextUrl.pathname;

  // 未登录（或 JWT 失效）→ 跳登录页
  if (!role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 学生访问管理端 → 回到学生首页；管理员访问学生端 → 回到管理端首页
  if (path.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/student/exams", request.url));
  }
  if (path.startsWith("/student") && role !== "student") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/admin/:path*"],
};
