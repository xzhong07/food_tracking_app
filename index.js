import dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import fs from "fs";
import path from 'path';
import { fileURLToPath } from 'url';

// 現在のファイル名
const __filename = fileURLToPath(import.meta.url);

const app = express();
const port = 3000;
const __dirname = path.dirname(__filename);

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "food_tracking_app",
  password: process.env.PGPASSWORD,
  port: 5432,
});

db.connect();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// 食材一覧取得
async function getIngredients() {
  const result = await db.query(
    "SELECT * FROM added_ingredients"
  );
  return result.rows;
}

app.get("/", async (req, res) => {
  try {
    const addedIngredients = await getIngredients();

    let shownIngredients = [];

    for (const item of addedIngredients) {
      // ingredients_list から一致する食材を取得
      const result = await db.query(
        "SELECT duration, icon FROM ingredients_list WHERE LOWER(name) LIKE '%'||LOWER($1)||'%'",
        [item.name]
      );

      if (result.rows.length > 0) {
        const { duration, icon } = result.rows[0];

        const today = new Date();
        const addedDate = new Date(item.added_date);

        // 日数差を計算（ミリ秒 → 日）
        const diffTime = today - addedDate;
        const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        const remainingDays = duration - daysPassed;

        if (remainingDays < 0) {
          await db.query('DELETE FROM added_ingredients WHERE id = $1', [item.id]);
          continue;
        }
        
        shownIngredients.push({
        id:item.id,
        name: item.name,
        quantity: item.quantity,
        expiration_day: remainingDays,
        icon: icon,
        });

      }
    }

    //  残り日数が少ない順にソート
    shownIngredients.sort(
      (a, b) => a.expiration_day - b.expiration_day
    );

    // 3日以下の食材をフィルタリング
    const expiringIngredients = shownIngredients.filter(
      (item) => item.expiration_day <= 3
    );

    const now = new Date();
    const dateInfo = {
      weekday: now.toLocaleDateString("en-US", { weekday: "long" }),
      monthDay: now.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      }),
      year: now.getFullYear(),
    };

    res.render("index.ejs", {
      dateInfo: dateInfo,
      ingredients: shownIngredients,
      expiringIngredients: expiringIngredients,
    });
  } catch (err) {
    console.error("Error fetching ingredients", err);
    res.status(500).send("Error fetching ingredients from database");
  }
});

// 食材詳細ページ
app.get("/ingredient/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const addedResult = await db.query(
      "SELECT id, name, quantity, added_date FROM added_ingredients WHERE id = $1",
      [id]
    );

    if (addedResult.rows.length === 0) {
      return res.status(404).send("Ingredient not found");
    }

    const added = addedResult.rows[0];
    const listResult = await db.query(
      "SELECT duration, icon FROM ingredients_list WHERE LOWER(name) LIKE '%'||LOWER($1)||'%'",
      [added.name]
    );

    let icon = "🍎";
    let duration = 0;
    if (listResult.rows.length > 0) {
      icon = listResult.rows[0].icon;
      duration = listResult.rows[0].duration || 0;
    }

    const addedDate = new Date(added.added_date);
    const bestBefore = new Date(addedDate);
    bestBefore.setDate(bestBefore.getDate() + duration);

    const ingredient = {
      id: added.id,
      name: added.name,
      quantity: added.quantity,
      icon: icon,
      dateAdded: addedDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      bestBefore: bestBefore.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };

    res.render("ingredient_detail.ejs", 
      { ingredient, 
        expiringIngredients: []
      });
  } catch (err) {
    console.error("Error fetching ingredient detail", err);
    res.status(500).send("Error loading ingredient");
  }
});

// レシピ提案ページ
app.post("/ingredient/:id/recipes", async (req, res) => {
  const id = req.params.id;

  try {
    // -----------------------------------
    // ① 選択された材料を取得
    // -----------------------------------
    const addedResult = await db.query(
      "SELECT id, name, quantity, added_date FROM added_ingredients WHERE id = $1",
      [id]
    );

    if (addedResult.rows.length === 0) {
      return res.status(404).send("Ingredient not found");
    }

    const added = addedResult.rows[0];

    // -----------------------------------
    // ② icon取得
    // -----------------------------------
    const listResult = await db.query(
      "SELECT icon FROM ingredients_list WHERE LOWER(name) LIKE '%'||LOWER($1)||'%'",
      [added.name]
    );

    let icon = "🍎";

    if (listResult.rows.length > 0) {
      icon = listResult.rows[0].icon || "🍎";
    }

    const apiKey = process.env.SPOONACULAR_API_KEY;

    if (!apiKey) {
      return res.status(500).send("API key not configured.");
    }

    // -----------------------------------
    // ③ 選択食材を必ず含める
    // -----------------------------------
    const response = await axios.get(
      "https://api.spoonacular.com/recipes/findByIngredients",
      {
        params: {
          apiKey: apiKey,
          ingredients: added.name,
          number: 20,
          ranking: 2, // ← 不足食材最小化優先
          ignorePantry: false,
        },
      }
    );

    let recipes = Array.isArray(response.data) ? response.data : [];

    // -----------------------------------
    // ④ 「選択食材を含む」ものだけに限定
    // -----------------------------------
    recipes = recipes.filter(
      (r) => (r.usedIngredientCount || 0) > 0
    );

    // -----------------------------------
    // ⑤ 追加購入数でソート
    //    (= missedIngredientCount 昇順)
    // -----------------------------------
    recipes.sort((a, b) => {
      const missedA = a.missedIngredientCount || 0;
      const missedB = b.missedIngredientCount || 0;

      if (missedA !== missedB) {
        return missedA - missedB; // 少ない順
      }

      // 同じ場合は使用食材が多い順
      return (b.usedIngredientCount || 0) - (a.usedIngredientCount || 0);
    });

    // -----------------------------------
    // ⑥ 表示用データ作成
    // -----------------------------------
    const simplifiedRecipes = recipes.map((r) => ({
      id: r.id,
      title: r.title,
      image: r.image,
      ingredientsCount: r.missedIngredientCount || 0, // 🔥 追加購入数
    }));

    const ingredient = {
      id: added.id,
      name: added.name,
      quantity: added.quantity,
      icon: icon,
    };

    res.render("suggested_recipes.ejs", {
      ingredient,
      recipes: simplifiedRecipes,
      expiringIngredients: []
    });

  } catch (err) {
    console.error("Error fetching suggested recipes", err);
    res.status(500).send("Error loading recipes");
  }
});

app.post("/add", async (req, res) => {
  const { ingredientName, quantity } = req.body;

  try {
    // ホーム画面からの遷移（まだフォーム未入力）の場合は入力画面を表示
    if (!ingredientName) {
      return res.render("add_ingredient.ejs");
    }

    // フォーム送信時はDBに追加してトップへ戻る
    await db.query(
      "INSERT INTO added_ingredients (name, quantity, added_date) VALUES ($1, $2, NOW())",
      [ingredientName, quantity || null]
    );

    res.redirect("/");
  } catch (err) {
    console.error("Error adding ingredient", err);
    res.status(500).send("Error adding ingredient");
  }
});

app.post("/ingredient/:id/delete", async (req, res) => {
  const id = req.params.id;

  try {
    await db.query("DELETE FROM added_ingredients WHERE id = $1", [id]);
    res.redirect("/");
  } catch (err) {
    console.error("Error deleting ingredient", err);
    res.status(500).send("Error deleting ingredient");
  }
});

app.get("/camera",(req,res)=>{
  res.render("camera.ejs");
});

app.post("/upload", express.json({ limit: "10mb" }), (req, res) => {
  const { image } = req.body;

  const base64Data = image.replace(/^data:image\/png;base64,/, "");
  const filePath = path.join(__dirname, "image", `capture-${Date.now()}.png`);

  fs.writeFile(filePath, base64Data, "base64", (err) => {
    if (err) {
      console.error("Failed to save image:", err);
      return res.status(500).json({ success: false });
    }
    console.log("Image saved:", filePath);

    // 画像保存完了後にリダイレクト
    res.redirect("/conformation");
  });
});

app.get("/conformation",(req,res)=>{
  const dateInfo={
    weekday:"date you bought",
    monthDay:"March 28",
    year:2026
  }
  res.render("conformation.ejs", 
    { dateInfo,
      expiringIngredients: []
    });
});

app.post("/confirm",async(req,res)=>{
  await db.query("INSERT INTO added_ingredients (name, quantity, added_date) VALUES ($1, $2, NOW())", ["egg", 1]);
  await db.query("INSERT INTO added_ingredients (name, quantity, added_date) VALUES ($1, $2, NOW())", ["broccoli", 1]);
  await db.query("INSERT INTO added_ingredients (name, quantity, added_date) VALUES ($1, $2, NOW())", ["carrots", 3]);
  res.redirect("/");
})

app.get("/search",(req,res)=>{
  res.render("search.ejs",{
    expiringIngredients: []
  });
});

app.get("/saved-recipes", async (req, res) => {
  try {
    const response = await axios.get("https://api.spoonacular.com/recipes/random", {
      params: {
        apiKey: process.env.SPOONACULAR_API_KEY,
        includeNutrition: false,
        number: 5,
      },
    });

    const recipes = response.data.recipes || [];
    const savedRecipes = recipes.map((r) => ({
      title: r.title,
      image: r.image,
    }));

    res.render("saved_recipes.ejs", {
      savedRecipes,
      expiringIngredients: [],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Error fetching recipes");
  }
});

app.get("/profile", (req, res) => {
  res.render("profile.ejs", {
    expiringIngredients: []
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${port}`);
});

//Edamam