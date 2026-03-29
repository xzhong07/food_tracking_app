import express from "express";

const app = express();
const port = 3001;

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const dateInfo = { weekday: "Sunday", monthDay: "Mar 29", year: "2026" };

const ingredients = [
  {
    id: 1,
    name: "Egg",
    icon: "🥚",
    quantity: 6,
    expiration_day: 4,
    dateAdded: "Mar 28, 2026",
    bestBefore: "Apr 3, 2026",
  },
  {
    id: 2,
    name: "Broccoli",
    icon: "🥦",
    quantity: 1,
    expiration_day: 2,
    dateAdded: "Mar 28, 2026",
    bestBefore: "Mar 31, 2026",
  },
  {
    id: 3,
    name: "Carrots",
    icon: "🥕",
    quantity: 3,
    expiration_day: 7,
    dateAdded: "Mar 27, 2026",
    bestBefore: "Apr 5, 2026",
  },
];

const suggestedRecipes = [
  { title: "Egg Fried Rice", image: "", ingredientsCount: 3 },
  { title: "Roasted Broccoli Bowl", image: "", ingredientsCount: 2 },
  { title: "Carrot Soup", image: "", ingredientsCount: 4 },
];

const savedRecipes = [
  { title: "Avocado Toast", image: "" },
  { title: "Lemon Chicken", image: "" },
];

const expiringIngredients = [
  { name: "Milk", icon: "🥛", quantity: 1, expiration_day: 1 },
  { name: "Spinach", icon: "🥬", quantity: 1, expiration_day: 2 },
];

app.set("view engine", "ejs");
app.set("views", "views");

app.get("/", (req, res) => {
  res.render("index.ejs", { dateInfo, ingredients, expiringIngredients });
});

app.get("/add", (req, res) => {
  res.render("add_ingredient.ejs");
});

app.get("/ingredient/:id", (req, res) => {
  const selected = ingredients.find((item) => item.id === Number(req.params.id)) || ingredients[0];
  res.render("ingredient_detail.ejs", {
    ingredient: selected,
    expiringIngredients,
  });
});

app.post("/ingredient/:id/recipes", (req, res) => {
  res.redirect("/suggested-recipes");
});

app.get("/suggested-recipes", (req, res) => {
  res.render("suggested_recipes.ejs", {
    ingredient: ingredients[0],
    recipes: suggestedRecipes,
    expiringIngredients,
  });
});

app.post("/ingredient/:id/delete", (req, res) => {
  res.status(200).send("ok");
});

app.post("/add", (req, res) => {
  res.redirect("/");
});

app.get("/camera", (req, res) => {
  res.render("camera.ejs");
});

app.post("/upload", (req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/conformation", (req, res) => {
  res.render("conformation.ejs", {
    dateInfo,
    expiringIngredients,
  });
});

app.post("/confirm", (req, res) => {
  res.redirect("/");
});

app.get("/search", (req, res) => {
  res.render("search.ejs", { expiringIngredients });
});

app.get("/saved-recipes", (req, res) => {
  res.render("saved_recipes.ejs", { savedRecipes, expiringIngredients });
});

app.get("/profile", (req, res) => {
  res.render("profile.ejs", { expiringIngredients });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`UI preview server: http://localhost:${port}`);
});
