import express from "express";
import bcrypt from "bcrypt";
import fs from "fs/promises";
import path from "path";

const router = express.Router();
const USERS_FILE = path.join(process.cwd(), "data", "users.json");

// ログインページ表示
router.get("/login", (req, res) => {
    res.render("login", { error: null });
});

// ログイン処理
router.post("/login", async (req, res) => {
    const { id, password } = req.body;

    try {
        const data = await fs.readFile(USERS_FILE, "utf-8");
        const users = JSON.parse(data);

        const user = users.find((u) => u.id === id);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render("login", { error: "IDまたはパスワードが間違っています" });
        }

        req.session.userId = user.id;
        req.session.userName = user.name;
        res.redirect("/");
    } catch (error) {
        console.error("ログインエラー:", error);
        res.status(500).send("サーバーエラー");
    }
});

// ログアウト処理
router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

export default router;