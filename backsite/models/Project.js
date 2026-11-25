const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            required: true,
        },

        category: {
            type: String,
            required: true,
        },

        location: {
            type: String,
            default: "",
        },

        images: {
            type: [String],
            default: [],
        },

        videos: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

const Project = mongoose.model("Project", projectSchema);

module.exports = Project;