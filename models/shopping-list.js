const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ShopingListSchema = new Schema({
    recipes: [
        {
            type: Schema.Types.ObjectId,
            ref: "Recipe",
        }
    ]
})

module.exports = mongoose.model("MealPrep", ShopingListSchema);