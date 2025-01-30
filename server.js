import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import bcrypt from "bcrypt";

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
app.set("views", path.join(process.cwd(), "views"));

// ログインページ
app.get("/login", (req, res) => {
    res.render("login", { error: null });
});

// ログイン処理
app.post("/login", async (req, res) => {
    const { id, password } = req.body;
    try {
        const usersFilePath = path.join(process.cwd(), "data", "users.json");
        const usersData = await fs.readFile(usersFilePath, "utf-8");
        const users = JSON.parse(usersData);

        const user = users.find((u) => u.id === id);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render("login", { error: "ユーザーIDまたはパスワードが違います" });
        }

        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.userRole = user.role || "user";

        res.redirect("/");
    } catch (error) {
        console.error("ログイン処理エラー:", error);
        res.status(500).send("エラーが発生しました");
    }
});

// ログアウト処理
app.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// ホームページ
app.get("/", (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/login");
    }
    res.render("index", { userName: req.session.userName || "ゲスト" });
});

// ユーザー管理ページ（管理者のみ）
app.get("/manage-users", async (req, res) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
        return res.redirect("/login");
    }

    try {
        const usersFilePath = path.join(process.cwd(), "data", "users.json");
        const usersData = await fs.readFile(usersFilePath, "utf-8");
        const users = JSON.parse(usersData);

        res.render("manage-users", { users, error: null });
    } catch (error) {
        console.error("ユーザー一覧の読み込みエラー:", error);
        res.status(500).send("エラーが発生しました");
    }
});

// **新規ユーザー登録**
app.post("/add-user", async (req, res) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
        return res.redirect("/login");
    }

    const { id, name, password, role } = req.body;

    try {
        const usersFilePath = path.join(process.cwd(), "data", "users.json");
        const usersData = await fs.readFile(usersFilePath, "utf-8");
        let users = JSON.parse(usersData);

        // ID重複チェック
        if (users.find((u) => u.id === id)) {
            return res.render("manage-users", { users, error: "このIDは既に存在しています" });
        }

        // パスワードをハッシュ化
        const hashedPassword = await bcrypt.hash(password, 10);

        // 新しいユーザーを追加
        const newUser = { id, name, password: hashedPassword, role };
        users.push(newUser);

        // JSONファイルに保存
        await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), "utf-8");

        res.redirect("/manage-users");
    } catch (error) {
        console.error("新規ユーザー登録エラー:", error);
        res.status(500).send("エラーが発生しました");
    }
});

// **ユーザー削除**
app.post("/delete-user", async (req, res) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
        return res.redirect("/login");
    }

    const { id } = req.body;

    try {
        const usersFilePath = path.join(process.cwd(), "data", "users.json");
        const usersData = await fs.readFile(usersFilePath, "utf-8");
        let users = JSON.parse(usersData);

        // 自分自身を削除できないようにする
        if (id === req.session.userId) {
            return res.render("manage-users", { users, error: "自分自身は削除できません" });
        }

        // ユーザー削除処理
        users = users.filter((user) => user.id !== id);

        // JSONファイルに保存
        await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), "utf-8");

        res.redirect("/manage-users");
    } catch (error) {
        console.error("ユーザー削除エラー:", error);
        res.status(500).send("エラーが発生しました");
    }
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`🚀 サーバーが http://localhost:${PORT} で起動しました`);
});