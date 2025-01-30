import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import { isAuthenticated } from "./middlewares/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(
    session({
        secret: process.env.SESSION_SECRET || "default_secret",
        resave: false,
        saveUninitialized: false,
    })
);

// テンプレートエンジン設定
app.set("view engine", "ejs");

// 認証ルートを適用
app.use(authRoutes);

// ルートページ（認証チェック）
app.get("/", isAuthenticated, (req, res) => {
    res.render("index", { userName: req.session.userName });
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`🚀 サーバーが http://localhost:${PORT} で起動しました`);
});