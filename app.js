const express = require('express');
const path = require('path');
const mongoose = require("mongoose");
require('dotenv').config();
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const Recipe = require("./models/recipe");
const Ingredient = require("./models/ingredient");
const MealPrep = require("./models/meal-prep");

const fs = require("fs");

const originalLog = console.log;

console.log = function(message) {
    const logMessage = `${new Date().toISOString()} - ${message}\n`;

    fs.appendFile("server.log", logMessage, (err) => {
        if (err) {
            originalLog("Error creating log file:", err);
        }
    });

    originalLog(message);
};

const port = process.env.PORT || 3000;

const uri = process.env.MONGODB_URI;

// Mogo DB setup server
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("MongoDB connected online!");
        createRecipe();
    })
    .catch((error) => {
        console.error("connection error MongoDB:", error);
    });

// Mogo DB setup local
/*mongoose.connect('mongodb://localhost:27017/meal-prep-me')
    .then(() => {
        console.log("MongoDB connected locally!");
    });*/

const app = express();

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(methodOverride("_method"));

app.get("/", (req, res) => {
    res.redirect("/recipes");
});

app.get("/recipes", async (req, res) => {
    const recipes = await Recipe.find({});
    res.render("recipes/index", {recipes});
})

app.get("/recipes/new", async (req, res) => {
    const ingredients = await Ingredient.find({});
    res.render("recipes/new", {ingredients});
})

app.post("/recipes", async (req, res) => {
    try {
        const { title, image, preparationTime, servings, ingredients, steps } = req.body.recipe;

        // step 1: loop ingredients, search by ingredient name
        const ingredientObjects = [];
        for (let i = 0; i < ingredients.length; i++) {
            const ingredientName = ingredients[i].name;  // Der Name der Zutat

            // search ingredient by name
            let ingredient = await Ingredient.findOne({ name: ingredientName });
            if (!ingredient) {
                // if ingredient is not existing, create ingredient
                ingredient = new Ingredient({ name: ingredientName });
                await ingredient.save();
            }

            // add ingredient to recipe
            ingredientObjects.push({
                quantity: Number(ingredients[i].quantity),
                unit: ingredients[i].unit,
                ingredient: ingredient._id
            });
        }

        // step 2: format recipe instructions
        const formattedSteps = steps.map((instruction, index) => ({
            number: index + 1,
            instruction
        }));

        // step 3: create recipe
        const recipe = new Recipe({
            title,
            image,
            preparationTime: Number(preparationTime),
            servings: Number(servings),
            steps: formattedSteps,
            ingredients: ingredientObjects
        });

        await recipe.save();

        res.redirect("/recipes");
    } catch (error) {
        console.error("Error creating recipe:", error);
        res.status(500).json({ message: "Error creating recipe:", error });
    }
});

app.get("/recipes/:id", async (req, res) => {
    const recipe = await Recipe.findById(req.params.id)
        .populate('ingredients.ingredient');
    const ingredients = await Ingredient.find({});

    let mealPrep = await MealPrep.findOne();
    if(!mealPrep) {
        mealPrep = { recipes: [] };
    }

    res.render("recipes/show", {recipe, mealPrep, ingredients});
})

app.get("/recipes/:id/edit", async (req, res) => {
    const recipe = await Recipe.findById(req.params.id)
        .populate("ingredients.ingredient");
    const ingredients = await Ingredient.find({});

    res.render("recipes/edit", {recipe, ingredients});
})

app.put("/recipes/:id", async (req, res) => {
    try {
        // extract recipe data from req.body
        const { title, image, preparationTime, servings, ingredients, steps } = req.body.recipe;
        const recipeId = req.params.id;

        // handle ingredients: every ingredient is searched by its unique name and created if non-existent
        const ingredientObjects = await Promise.all(
            ingredients.map(async (ing) => {
                const { name, quantity, unit } = ing;
                if (!name) return null; // skip empty ingredient

                // search ingredient by name
                let ingredient = await Ingredient.findOne({ name: name.trim() });
                if (!ingredient) {
                    // if ingredient is not existing, create ingredient
                    ingredient = new Ingredient({ name: name.trim() });
                    await ingredient.save();
                }
                return {
                    quantity: Number(quantity),
                    unit,
                    ingredient: ingredient._id
                };
            })
        );
        // remove null values (if ingredients without a name were submitted)
        const formattedIngredients = ingredientObjects.filter(obj => obj !== null);

        // format recipe instructions
        const formattedSteps = steps.map((instruction, index) => ({
            number: index + 1,
            instruction: instruction.trim()
        }));

        // update recipe data
        const updatedRecipe = await Recipe.findByIdAndUpdate(
            recipeId,
            {
                title,
                image,
                preparationTime: Number(preparationTime),
                servings: Number(servings),
                ingredients: formattedIngredients,
                steps: formattedSteps
            },
            { new: true } // Gibt das aktualisierte Rezept zurück
        );
        res.redirect("/recipes");
    } catch (error) {
        console.log(req.body)
        console.error("Error updating recipe:", error);
        res.status(500).json({ message: "Error updating recipe:", error });
    }
});

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

    let mealPrepList = await MealPrep.findOne();
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
        return res.redirect("/meal-prep");
    }

    mealPrepList.recipes = mealPrepList.recipes.filter(id => id && id.toString() !== recipeId);
    await mealPrepList.save();

    res.redirect("/meal-prep");
})

app.get("/ingredients", async (req, res) => {
    const ingredients = await Ingredient.find({});
    res.render("ingredients/index", {ingredients});
});

app.get("/ingredients/new", (req, res) => {
    res.render("ingredients/new");
});

app.post("/ingredients", async (req, res) => {
    const ingredient = new Ingredient({ ...req.body.ingredient })
    await ingredient.save();
    res.redirect("/ingredients");
});

app.put("/ingredients/:id", async (req, res) => {
    const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, {...req.body.ingredient});
    res.redirect("/ingredients");
});

app.get("/ingredients/:id/edit", async (req, res) => {
    const ingredient = await Ingredient.findById(req.params.id);
    res.render("ingredients/edit", {ingredient});
});

app.delete("/ingredients/:id", async (req, res) => {
    const {id} = req.params;
    await Ingredient.findByIdAndDelete(id);
    res.redirect("/ingredients");
});

app.get("/shopping-list", (req, res) => {
    res.render("shopping-list/index");
})

app.listen(port, () => {
    console.log(`Serving on Port ${port}`)
});