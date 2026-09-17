import type { NextFunction, Request, Response } from "express";

// 包装 async controller：Express 4 不会自动捕获 Promise rejection，
// 用 .catch(next) 把错误交给 errorHandler 统一处理
export function asyncHandler<Req extends Request>(
  fn: (req: Req, res: Response) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req as Req, res).catch(next);
  };
}
