import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

// users.json のパスを取得
const usersFilePath = path.join(process.cwd(), 'data', 'users.json');

// users.json を読み込む
const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf-8'));

// パスワードをハッシュ化して保存
const saltRounds = 10;

async function hashPasswords() {
    for (const user of users) {
        if (!user.password.startsWith('$2b$')) {  // すでにハッシュ化済みならスキップ
            user.password = await bcrypt.hash(user.password, saltRounds);
        }
    }

    // ハッシュ化したデータを users.json に書き戻す
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    console.log('✅ users.json のパスワードをハッシュ化しました！');
}

// 関数を実行
hashPasswords();