const Joi = require("joi");

const projectSchema = Joi.object({
    title: Joi.string().min(2).max(100).required(),

    description: Joi.string().min(5).max(1000).required(),

    category: Joi.string().min(2).max(50).required(),

    location: Joi.string().max(100).allow(""),

    images: Joi.array()
        .items(Joi.string())
        .default([]),

    videos: Joi.array()
        .items(Joi.string())
        .default([]),
});

const updateProjectSchema = Joi.object({
    title: Joi.string().min(2).max(100),

    description: Joi.string().min(5).max(1000),

    category: Joi.string().min(2).max(50),

    location: Joi.string().max(100).allow(""),

    images: Joi.array()
        .items(Joi.string()),

    videos: Joi.array()
        .items(Joi.string()),
}).min(1);

const validateProject = (data) => {
    return projectSchema.validate(data, { abortEarly: false });
};

const validateProjectUpdate = (data) => {
    return updateProjectSchema.validate(data, { abortEarly: false });
};

module.exports = {
    validateProject,
    validateProjectUpdate,
};