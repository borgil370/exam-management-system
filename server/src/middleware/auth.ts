import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import type { Role } from "../types";
import { fail } from "../utils/response";

export interface TokenPayload {
  sub: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

// 从 httpOnly Cookie 中取出 JWT 并校验，通过则把用户信息挂到 req.user
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.[config.cookieName];
  if (!token) {
    return fail(res, 401, "未登录");
  }
  try {
    req.user = jwt.verify(token, config.jwtSecret) as TokenPayload;
    next();
  } catch {
    return fail(res, 401, "登录已失效，请重新登录");
  }
}

// 校验角色：角色不对返回 403
export function requireRole(role: Role) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return fail(res, 403, "没有权限访问该资源");
    }
    next();
  };
}
