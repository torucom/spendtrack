# SpendTrack

SpendTrackは、経費管理アプリケーションです。このプロジェクトは、Node.js、Express、EJSを使用して構築されています。GitHubリポジトリから最新のコードをサーバーにデプロイし、アプリケーションの管理を行います。

## インストール方法

1. サーバーにSSHでログインします。

    ```bash
    ssh <your-username>@<server-ip>
    ```

2. プロジェクトディレクトリに移動します。

    ```bash
    cd /path/to/your/project/directory
    ```

3. リモートリポジトリから最新のコードを取得します。

    ```bash
    git pull origin main
    ```

4. 依存関係をインストールします。

    ```bash
    npm install
    ```

5. アプリケーションを再起動します。PM2を使用している場合：

    ```bash
    pm2 restart <your-app-name>
    ```

   または、`forever`を使用している場合：

    ```bash
    forever restart <your-app-name>
    ```

## デプロイ方法

デプロイはGitHubリポジトリにコードをプッシュすることにより、サーバー側で自動的にGit Pullを行って反映されます。手動デプロイの場合、上記の手順に従って手動でコードを更新してください。

## 使用技術

- **バックエンド**: Node.js, Express
- **テンプレートエンジン**: EJS
- **フロントエンド**: HTML, CSS (SASS), JavaScript
- **データベース**: JSONファイルでのデータ管理

## ライセンス

このプロジェクトはMITライセンスの下で提供されています。詳細はLICENSEファイルを参照してください。