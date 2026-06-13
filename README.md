# Recipe Suggestion App

持っている食材と賞味期限を考慮してレシピの提案を行うWebアプリケーションです。  

## 概要

このアプリケーションは、ユーザーが入力した食材情報と賞味期限をもとに、適切なレシピを提案することを目的としています。  
外部APIとデータベースを組み合わせたバックエンド処理の設計・実装を行いました。

レシピ情報の取得には **Spoonacular API** を使用しています。

## 使用技術

### フロントエンド
- EJS（テンプレートエンジン）
- HTML / CSS

### バックエンド
- Node.js
- Express

### データベース
- PostgreSQL
- pgAdmin

### 外部API
- Spoonacular API

### 使用ライブラリ
```javascript
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
など
```

# How to Launch the Application

## 2. Set Up the Database
Run the following command:

```bash
git clone https://github.com/uts2-XingyuZhong/food_tracking_app.git
```

## 2. Set Up the Database
- Open pgAdmin.
- Create a database named `food_tracking_app`.
- Import the two CSV files located in the `database` folder.
- Create the following two tables:
  - `added_ingredients`
  - `ingredients_list`

## 3. Install Dependencies
Run the following command:

```bash
npm install
```

## 4. Obtain an API Key
Visit the following URL and get your API key:

https://spoonacular.com/food-api

## 5. Create an Environment File
Create a `.env` file and add the following content:

```env
PGPASSWORD="yourPGAdminPassward"
SPOONACULAR_API_KEY="yourAPIKey"
```

## 6. Run the Application
Execute the following command:

```bash
node index.js
```
## 7. Access the Application
Open your browser and go to:

http://localhost:3000
