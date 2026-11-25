
const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Project = require("../models/Project");
const requireAdmin = require("../middleware/requireAdmin");

const {
    validateProject,
    validateProjectUpdate,
} = require("../validation/projectValidation");

// =====================================
// GET - הצגת כל הפרויקטים
// פתוח לכל הגולשים
// =====================================

router.get("/", async (req, res) => {
    try {
        const projects = await Project.find();

        res.status(200).json(projects);
    } catch (error) {
        console.error("Error getting projects:", error);

        res.status(500).json({
            message: "Error getting projects",
        });
    }
});

// =====================================
// GET - הצגת פרויקט לפי ID
// פתוח לכל הגולשים
// =====================================

router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid project ID",
            });
        }

        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        res.status(200).json(project);
    } catch (error) {
        console.error("Error getting project:", error);

        res.status(500).json({
            message: "Error getting project",
        });
    }
});

// =====================================
// POST - הוספת פרויקט
// מנהל בלבד
// =====================================

router.post("/", requireAdmin, async (req, res) => {
    try {
        const { error } = validateProject(req.body);

        if (error) {
            return res.status(400).json({
                message: "Validation error",
                errors: error.details.map(
                    (detail) => detail.message
                ),
            });
        }

        const newProject = new Project(req.body);

        const savedProject = await newProject.save();

        res.status(201).json(savedProject);
    } catch (error) {
        console.error("Error creating project:", error);

        res.status(500).json({
            message: "Error creating project",
        });
    }
});

// =====================================
// PUT - עדכון פרויקט
// מנהל בלבד
// =====================================

router.put("/:id", requireAdmin, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid project ID",
            });
        }

        const { error } = validateProjectUpdate(req.body);

        if (error) {
            return res.status(400).json({
                message: "Validation error",
                errors: error.details.map(
                    (detail) => detail.message
                ),
            });
        }

        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedProject) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        res.status(200).json(updatedProject);
    } catch (error) {
        console.error("Error updating project:", error);

        res.status(500).json({
            message: "Error updating project",
        });
    }
});

// =====================================
// DELETE - מחיקת פרויקט
// מנהל בלבד
// =====================================

router.delete("/:id", requireAdmin, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid project ID",
            });
        }

        const deletedProject = await Project.findByIdAndDelete(
            req.params.id
        );

        if (!deletedProject) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        res.status(200).json({
            message: "Project deleted successfully",
            project: deletedProject,
        });
    } catch (error) {
        console.error("Error deleting project:", error);

        res.status(500).json({
            message: "Error deleting project",
        });
    }
});

module.exports = router;
