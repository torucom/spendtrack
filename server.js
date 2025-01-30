import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = "./data/users.json";
const EXPENSES_FILE = "./data/expenses.json";

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
app.set("views", path.join(process.cwd(), "views"));

// ユーザーデータを読み込む関数
const loadUsers = () => {
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    } catch (error) {
        return [];
    }
};

// 経費データを読み込む関数
const loadExpenses = () => {
    try {
        return JSON.parse(fs.readFileSync(EXPENSES_FILE, "utf8"));
    } catch (error) {
        return [];
    }
};

// ログイン画面
app.get("/login", (req, res) => {
    res.render("login", { error: null });
});

// ログイン処理
app.post("/login", async (req, res) => {
    const { id, password } = req.body;
    const users = loadUsers();
    const user = users.find((user) => user.id === id);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.render("login", { error: "ログインIDまたはパスワードが間違っています。" });
    }

    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.role = user.role || "user";
    res.redirect("/");
});

// ログアウト処理
app.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// ユーザー管理画面（管理者のみ）
app.get("/manage-users", (req, res) => {
    if (req.session.role !== "admin") {
        return res.redirect("/");
    }
    const users = loadUsers();
    res.render("manage-users", { users });
});

// ホーム画面（経費一覧）
app.get("/", (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/login");
    }
    const expenses = loadExpenses();
    res.render("index", { user: { name: req.session.userName }, expenses });
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`🚀 サーバーが http://localhost:${PORT} で起動しました`);
});
