import type { Response } from "express";

// 统一返回结构：成功 { code: 0, message: "ok", data }，失败 { code: 状态码, message, data: null }

export function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ code: 0, message: "ok", data });
}

export function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ code: status, message, data: null });
}
