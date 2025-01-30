import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import dotenv from "dotenv";

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
    saveUninitialized: true,
  })
);

// テンプレートエンジン設定
app.set("view engine", "ejs");

// ルートページ
app.get("/", (req, res) => {
  res.render("index", { userName: req.session.userName || "ゲスト" });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 サーバーが http://localhost:${PORT} で起動しました`);
});