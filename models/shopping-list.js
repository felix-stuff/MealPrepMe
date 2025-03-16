const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ShoppingListSchema = new Schema({
    ingredients: [
        {
            type: Schema.Types.ObjectId,
            ref: "Recipe",
        }
    ]
})

module.exports = mongoose.model("MealPrep", ShoppingListSchema);