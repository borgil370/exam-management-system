import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { findUserByEmail } from "../db";
import { authenticate, type AuthRequest, type TokenPayload } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const authRouter = Router();

function publicUser(payload: TokenPayload) {
  return { id: payload.sub, name: payload.name, email: payload.email, role: payload.role };
}

// POST /api/auth/login  校验账号密码，下发 httpOnly Cookie
authRouter.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ message: "请输入账号和密码" });
  }

  const user = await findUserByEmail(String(email));
  const passwordOk = user && (await bcrypt.compare(String(password), user.passwordHash));
  if (!user || !passwordOk) {
    return res.status(401).json({ message: "账号或密码错误" });
  }

  const payload: TokenPayload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });

  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 2, // 与 JWT_EXPIRES_IN=2h 对应
  });
  res.json({ user: publicUser(payload) });
}));

// POST /api/auth/logout  清除 Cookie
authRouter.post("/logout", (_req, res) => {
  res.clearCookie(config.cookieName);
  res.json({ message: "已退出登录" });
});

// GET /api/auth/me  返回当前登录用户
authRouter.get("/me", authenticate, (req: AuthRequest, res) => {
  res.json({ user: publicUser(req.user!) });
});
