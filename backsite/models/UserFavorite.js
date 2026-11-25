
const mongoose = require("mongoose");

const userFavoriteSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        projectIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Project",
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    "UserFavorite",
    userFavoriteSchema
);
