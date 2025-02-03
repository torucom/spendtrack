import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = "./data/users.json";
const EXPENSES_FILE = "./data/expenses.json";
const BUDGET_FILE = "./data/budget.json";

/* ==============================
   🗄️ データ処理関数
================================= */
const loadJson = (filePath, defaultValue = {}) => {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (err) {
        return defaultValue;
    }
};

const saveJson = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const loadUsers = () => loadJson(USERS_FILE, []);
const loadBudget = () => loadJson(BUDGET_FILE, {});
const loadExpenses = () => {
    let expenses = loadJson(EXPENSES_FILE, []);
    let updated = false;

    expenses = expenses.map(expense => {
        if (!expense.id) {
            expense.id = uuidv4();
            updated = true;
        }
        return expense;
    });

    if (updated) {
        saveJson(EXPENSES_FILE, expenses);
    }

    return expenses;
};

/* ==============================
   🛠️ ミドルウェア & 設定
================================= */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: true,
}));

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

/* ==============================
   🏠 ホーム画面（経費一覧）
================================= */
app.get("/", (req, res) => {
    if (!req.session.userId) return res.redirect("/login");

    const expenses = loadExpenses();
    const users = loadUsers();
    const user = users.find((u) => u.id === req.session.userId) || {};

    const now = new Date();
    const selectedYear = parseInt(req.query.year) || now.getFullYear();
    const selectedMonth = String(parseInt(req.query.month) || now.getMonth() + 1).padStart(2, "0");

    const filteredExpenses = expenses.filter(expense =>
        expense.userId === req.session.userId &&
        expense.date.startsWith(`${selectedYear}-${selectedMonth}`)
    );

    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (parseInt(expense.amount, 10) || 0), 0);
    const budgetData = loadBudget();
    const currentBudget = budgetData[`${selectedYear}-${selectedMonth}`] || 0;
    const remainingBudget = currentBudget - totalExpenses;

    // 📌 DBに登録がある月を取得する（`monthList` から `active` の月を抽出）
    const monthList = Array.from({ length: 12 }, (_, i) => {
        const month = String(i + 1).padStart(2, "0");
        return {
            month,
            active: expenses.some(expense => expense.date.startsWith(`${selectedYear}-${month}`))
        };
    });
    const dbRegisteredMonths = monthList.filter(m => m.active).map(m => m.month); // 📌 登録済みの月だけ抽出

    res.render("index", {
        user,
        expenses: filteredExpenses,
        totalExpenses,
        selectedYear,
        selectedMonth,
        previousYear: selectedYear - 1,
        nextYear: selectedYear + 1,
        monthList,
        dbRegisteredMonths, // 📌 ここで EJS に渡す！
        budget: budgetData,
        currentBudget,
        remainingBudget
    });
});

/* ==============================
   🔑 認証機能（ログイン・ログアウト）
================================= */
app.get("/login", (req, res) => res.render("login", { error: null }));

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

app.post("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});

/* ==============================
   🔑 ユーザー管理ページ
================================= */
app.get("/manage-users", (req, res) => {
    if (!req.session.userId || req.session.role !== "admin") {
        return res.status(403).send("アクセス権限がありません");
    }

    const users = loadUsers(); // ユーザー一覧を取得
    res.render("manage-users", { users, currentUser: req.session });
});

app.post("/manage-users/add", async (req, res) => {
    if (!req.session.userId || req.session.role !== "admin") {
        return res.status(403).send("Unauthorized");
    }

    const { id, email, password, name, role } = req.body;
    if (!id || !email || !password || !name) {
        return res.status(400).send("すべての項目を入力してください。");
    }

    let users = loadUsers();
    if (users.some(user => user.id === id)) {
        return res.status(400).send("このIDは既に登録されています。");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ id, email, password: hashedPassword, name, role: role || "user" });

    saveJson(USERS_FILE, users);
    res.redirect("/manage-users");
});

app.post("/manage-users/delete", (req, res) => {
    if (!req.session.userId || req.session.role !== "admin") {
        console.log("🛑 ユーザー削除拒否: 権限がありません");
        return res.status(403).send("Unauthorized");
    }

    console.log("🛠️ 削除リクエスト受信 (raw):", req.body);

    if (!req.body.id) {
        console.log("⚠️ 削除リクエストにIDが含まれていません");
        return res.status(400).send("削除するユーザーIDが不明です。");
    }

    let users = loadUsers();
    const initialUserCount = users.length;

    users = users.filter(user => user.id !== req.body.id);

    if (users.length === initialUserCount) {
        console.log(`⚠️ 指定されたID(${req.body.id})のユーザーが見つかりません`);
        return res.status(404).send("指定されたユーザーが見つかりません。");
    }

    saveJson(USERS_FILE, users);
    console.log(`✅ ユーザー ${req.body.id} を削除しました`);

    res.redirect("/manage-users");
});

/* ==============================
   💰 予算設定機能
================================= */
app.post("/budget/set", (req, res) => {
    if (!req.session.userId) return res.status(403).send("Unauthorized");

    console.log("受信したデータ:", req.body); // 🔍 デバッグ用ログ

    const { year, month, amount } = req.body;
    if (!year || !month || amount === undefined || amount.trim() === "") {
        return res.status(400).send("すべての項目を入力してください。");
    }

    const budgetData = loadJson(BUDGET_FILE, {});
    budgetData[`${year}-${month}`] = parseInt(amount, 10) || 0;
    saveJson(BUDGET_FILE, budgetData);

    res.redirect("/");
});

/* ==============================
   経費管理（登録・更新・削除）
================================= */
app.post("/expenses/add", (req, res) => {
    if (!req.session.userId) return res.status(403).send("Unauthorized");

    const { date, description, amount } = req.body;
    if (!date || !description || !amount) return res.status(400).send("すべての項目を入力してください。");

    const expenses = loadExpenses();
    expenses.push({ id: uuidv4(), date, description, amount: parseInt(amount, 10), userId: req.session.userId });
    saveJson(EXPENSES_FILE, expenses);

    res.redirect("/");
});

app.post("/expenses/delete", (req, res) => {
    if (!req.session.userId) return res.status(403).send("Unauthorized");

    const { id } = req.body;
    if (!id) return res.status(400).send("削除する経費IDが不明です。");

    let expenses = loadExpenses().filter(expense => expense.id !== id);
    saveJson(EXPENSES_FILE, expenses);
    res.redirect("/");
});

// 経費編集画面
app.get("/expenses/edit/:id", (req, res) => {
    if (!req.session.userId) return res.redirect("/login");

    const { id } = req.params;
    const expenses = loadExpenses();
    const expense = expenses.find(exp => exp.id === id);

    if (!expense) return res.status(404).send("該当する経費が見つかりません。");

    res.render("edit-expense", { expense });
});

// 経費更新処理
app.post("/expenses/update", (req, res) => {
    if (!req.session.userId) return res.status(403).send("Unauthorized");

    console.log("更新リクエスト受信:", req.body); // デバッグ用ログ

    const { id, date, description, amount } = req.body;
    let expenses = loadExpenses();

    let expenseIndex = expenses.findIndex(expense => expense.id === id);
    if (expenseIndex === -1) return res.status(404).send("該当する経費が見つかりません。");

    expenses[expenseIndex] = { ...expenses[expenseIndex], date, description, amount: parseInt(amount, 10) };

    saveJson(EXPENSES_FILE, expenses);
    res.redirect("/");
});

/* ==============================
   🚀 サーバー起動
================================= */
app.listen(PORT, () => console.log(`🚀 サーバーが http://localhost:${PORT} で起動しました`));