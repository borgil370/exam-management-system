import express from "express";
import cookieParser from "cookie-parser";
import { config } from "./config";
import { authRouter } from "./routes/auth";
import { examRouter } from "./routes/exam";
import { questionRouter } from "./routes/question";
import { submissionRouter } from "./routes/submission";
import { statsRouter } from "./routes/stats";
import { errorHandler, notFoundHandler } from "./middleware/error";

// 入口只负责装配：中间件 → 路由 → 404 → 统一错误处理
const app = express();

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api", examRouter);
app.use("/api", questionRouter);
app.use("/api", submissionRouter);
app.use("/api/admin/scores", statsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`API server listening on http://localhost:${config.port}`);
});
