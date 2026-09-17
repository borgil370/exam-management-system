import type { NextFunction, Request, Response } from "express";
import { fail } from "../utils/response";

// service 层抛出此错误来表示业务失败，由 errorHandler 统一转成 JSON 响应
export class AppError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// 兜底：没有匹配到的路由
export function notFoundHandler(_req: Request, res: Response) {
  return fail(res, 404, "接口不存在");
}

// 统一错误处理：AppError 按自带状态码返回，其余一律 500
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return fail(res, err.status, err.message);
  }
  console.error("未捕获的错误：", err);
  return fail(res, 500, "服务器内部错误");
}
