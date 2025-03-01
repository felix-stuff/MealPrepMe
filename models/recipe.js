const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RecipeSchema = new Schema({
    title: String,
    image: String,
    description: String
})

module.exports = mongoose.model("Recipe", RecipeSchema);