const express = require('express');
const path = require('path');
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const Recipe = require("./models/recipe");
const MealPrep = require("./models/meal-prep");

mongoose.connect('mongodb://localhost:27017/meal-prep-me');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'));
db.once('open', () => {
    console.log('database connected');
})

const app = express();

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));

app.get("/", (req, res) => {
    res.redirect("/recipes");
});

app.get("/recipes", async (req, res) => {
    const recipes = await Recipe.find({});
    res.render("recipes/index", {recipes});
})

app.get("/recipes/new", (req, res) => {
    res.render("recipes/new");
})

app.post("/recipes", async (req, res) => {
    const formattedSteps = req.body.steps.map((text, index) => ({
        number: index + 1,
        instruction: text
    }));

    const recipe = new Recipe({ ...req.body.recipe, steps: formattedSteps })
    await recipe.save();
    res.redirect(`/recipes/${recipe._id}`);
})

app.get("/recipes/:id", async (req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    const mealPrep = await MealPrep.findOne();
    res.render("recipes/show", {recipe, mealPrep});
})

app.get("/recipes/:id/edit", async (req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    res.render("recipes/edit", {recipe});
})

app.put("/recipes/:id", async (req, res) => {
    const {id} = req.params;
    const recipe = await Recipe.findByIdAndUpdate(id, {...req.body.recipe});
    res.redirect(`/recipes/${recipe._id}`);
})

app.delete("/recipes/:id", async (req, res) => {
    const {id} = req.params;
    await Recipe.findByIdAndDelete(id);
    res.redirect("/recipes");
})

app.get("/meal-prep", async (req, res) => {
    const mealPrepList = await MealPrep.findOne().populate("recipes");
    res.render("meal-prep/index", {mealPrepList});
})

app.post("/meal-prep", async (req, res) => {
    const {recipeId} = req.body;

    let mealPrepList = await MealPrep.findOne(); // Es gibt nur eine Liste
    if (!mealPrepList) {
        mealPrepList = new MealPrep({recipes: []});
    }

    if (!mealPrepList.recipes.includes(recipeId)) {
        mealPrepList.recipes.push(recipeId);
        await mealPrepList.save();
    }

    res.redirect("/meal-prep");
})

app.delete("/meal-prep/:recipeId", async (req, res) => {
    const { recipeId } = req.params;

    let mealPrepList = await MealPrep.findOne();
    if (!mealPrepList || !mealPrepList.recipes) {
        return res.redirect("/meal-prep"); // Falls keine Liste existiert, abbrechen
    }

    mealPrepList.recipes = mealPrepList.recipes.filter(id => id && id.toString() !== recipeId);
    await mealPrepList.save();

    res.redirect("/meal-prep");
})

app.listen(3000, () => {
    console.log("Serving on Port 3000")
})