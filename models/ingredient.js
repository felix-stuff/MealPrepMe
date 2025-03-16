const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const StepSchema = new Schema({
    number: Number,
    instruction: String,
    completed: { type: Boolean, default: false }
})

const IngredientSchema = new Schema({
    quantity: Number,
    unit: String,
    name: String,
    icon: String
})

const RecipeSchema = new Schema({
    title: String,
    image: String,
    preparationTime: Number,
    servings: Number,
    steps: [StepSchema],
    ingredients: [IngredientSchema]
})

module.exports = mongoose.model("Recipe", RecipeSchema);