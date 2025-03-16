const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const StepSchema = new Schema({
    number: Number,
    instruction: String,
    completed: { type: Boolean, default: false }
})

const RecipeIngredientSchema = new Schema({
    quantity: Number,
    unit: String,
    ingredient: { type: Schema.Types.ObjectId, ref: "Ingredient" }
});

const RecipeSchema = new Schema({
    title: String,
    image: String,
    preparationTime: Number,
    servings: Number,
    steps: [StepSchema],
    ingredients: [RecipeIngredientSchema]
});

module.exports = mongoose.model("Recipe", RecipeSchema);