import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = "./data/users.json";
const EXPENSES_FILE = "./data/expenses.json";
const BUDGET_FILE = "./data/budget.json";

// データロード関数
const loadJson = (filePath, defaultValue) => {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (err) {
        return defaultValue;
    }
};

const saveJson = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

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

// ホーム画面（経費一覧）
app.get("/", (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    const expenses = loadJson(EXPENSES_FILE, []);
    const users = loadJson(USERS_FILE, []);
    const user = users.find((u) => u.id === req.session.userId) || {};

    const now = new Date();
    const selectedYear = parseInt(req.query.year) || now.getFullYear();
    const selectedMonth = String(parseInt(req.query.month) || now.getMonth() + 1).padStart(2, "0");

    // ユーザーが選択した月の経費をフィルタリング
    const filteredExpenses = expenses.filter(expense =>
        expense.userId === req.session.userId &&
        expense.date.startsWith(`${selectedYear}-${selectedMonth}`)
    );

    // 合計金額の計算
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (parseInt(expense.amount, 10) || 0), 0);

    // 予算データの取得
    const budget = loadJson(BUDGET_FILE, {});
    const currentBudget = budget[`${selectedYear}-${selectedMonth}`] || 0;
    const remainingBudget = currentBudget - totalExpenses;

    // 年ナビゲーション
    const previousYear = selectedYear - 1;
    const nextYear = selectedYear + 1;

    // 月別リスト
    const monthList = Array.from({ length: 12 }, (_, i) => {
        const month = String(i + 1).padStart(2, "0");
        return {
            month,
            active: expenses.some(expense => expense.date.startsWith(`${selectedYear}-${month}`))
        };
    });

    res.render("index", {
        user,
        expenses: filteredExpenses,
        totalExpenses,
        selectedYear,
        selectedMonth,
        previousYear,
        nextYear,
        monthList,
        budget,  // 修正: 予算データを統一
        currentBudget,
        remainingBudget
    });
});

// 予算設定処理
app.post("/budget/set", (req, res) => {
    console.log("リクエストボディ:", req.body);
    if (!req.session.userId) {
        return res.status(403).send("Unauthorized");
    }

    const { year, month, budget } = req.body; // フォームのname属性に合わせて修正
    if (!year || !month || !budget) {
        return res.status(400).send("すべての項目を入力してください。");
    }

    const budgetData = loadJson(BUDGET_FILE, {});
    budgetData[`${year}-${month}`] = parseInt(budget, 10); // `amount` → `budget` に修正
    saveJson(BUDGET_FILE, budgetData);

    res.redirect("/");
});

// ログイン処理
app.get("/login", (req, res) => {
    res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
    const { id, password } = req.body;
    const users = loadJson(USERS_FILE, []);
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

// サーバー起動
app.listen(PORT, () => {
    console.log(`🚀 サーバーが http://localhost:${PORT} で起動しました`);
});
