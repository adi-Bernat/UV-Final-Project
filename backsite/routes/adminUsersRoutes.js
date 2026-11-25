
"use strict";

const express = require("express");
const Joi = require("joi");
const mongoose = require("mongoose");
const User = require("../models/User");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

// כל הפעולות בקובץ זה דורשות הרשאת מנהל.
router.use(requireAdmin);

// משתמשים רשומים ומנהלים ותיקים נשמרים באוספים נפרדים.
// ניתן לערוך משתמשים רשומים, אך מנהלים ותיקים מוצגים לקריאה בלבד.
const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  email: Joi.string().trim().lowercase().email().max(254),
}).min(1).unknown(false);

// הרשאות המשתמש האפשריות במערכת.
const roleSchema = Joi.object({
  role: Joi.string().valid("user", "admin").required(),
}).unknown(false);

// פונקציות עזר לבדיקה ולהמרה של מזהה משתמש.
const idIsValid = (id) => mongoose.isValidObjectId(id);
const asObjectId = (id) => new mongoose.Types.ObjectId(id);

// הכנת פרטי משתמש רשום לשליחה לצד הלקוח.
function publicUser(user) {
  return {
    _id: String(user._id),
    name: String(user.name || ""),
    email: String(user.email || ""),
    role: user.role === "admin" ? "admin" : "user",
    createdAt: user.createdAt || null,
    accountType: "registered",
  };
}

// הכנת פרטי מנהל ותיק להצגה במערכת.
function publicLegacyAdmin(admin) {
  return {
    _id: String(admin._id),
    name: String(admin.name || "מנהל מערכת"),
    email: String(admin.email || ""),
    role: "admin",
    createdAt: admin.createdAt || null,
    accountType: "legacy-admin",
  };
}

// טיפול בשגיאות בעת ניהול משתמשים.
function handleError(error, res) {
  if (error?.code === 11000) {
    return res.status(409).json({
      message: "Email already exists",
    });
  }

  console.error("שגיאה בניהול משתמשים:", error);

  return res.status(500).json({
    message: "Server error",
  });
}

// קבלת רשימת כל המשתמשים והמנהלים במערכת.
// GET /api/admin/users
router.get("/", async (_req, res) => {
  try {
    const [users, admins] = await Promise.all([
      User.collection.find({}, {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          createdAt: 1,
        },
      }).sort({ _id: -1 }).toArray(),

      mongoose.connection.db.collection("admins")
        .find({}, {
          projection: {
            _id: 1,
            name: 1,
            email: 1,
            createdAt: 1,
          },
        })
        .toArray(),
    ]);

    return res.json({
      users: users.map(publicUser),
      legacyAdmins: admins.map(publicLegacyAdmin),
    });

  } catch (error) {
    return handleError(error, res);
  }
});

// עריכת שם וכתובת אימייל של משתמש רשום.
// לא ניתן לשנות סיסמאות באמצעות נתיב זה.
// PATCH /api/admin/users/:id
router.patch("/:id", async (req, res) => {
  if (!idIsValid(req.params.id)) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  const { error, value } = updateSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: "Validation error",
      errors: error.details.map(e => e.message),
    });
  }

  try {
    const id = asObjectId(req.params.id);

    const existing = await User.collection.findOne(
      { _id: id },
      { projection: { _id: 1 } }
    );

    if (!existing) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // בדיקה שכתובת האימייל אינה קיימת אצל משתמש אחר.
    if (value.email) {
      const emailPattern = new RegExp(
        "^" +
        value.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "$",
        "i"
      );

      const [userDuplicate, adminDuplicate] = await Promise.all([
        User.collection.findOne(
          {
            email: emailPattern,
            _id: { $ne: id },
          },
          { projection: { _id: 1 } }
        ),

        mongoose.connection.db.collection("admins").findOne(
          { email: emailPattern },
          { projection: { _id: 1 } }
        ),
      ]);

      if (userDuplicate || adminDuplicate) {
        return res.status(409).json({
          message: "Email already exists",
        });
      }
    }

    // עדכון פרטי המשתמש במסד הנתונים.
    const result = await User.collection.findOneAndUpdate(
      { _id: id },
      { $set: value },
      {
        returnDocument: "after",
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          createdAt: 1,
        },
      }
    );

    if (!result) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json(publicUser(result));

  } catch (error) {
    return handleError(error, res);
  }
});

// שינוי הרשאת משתמש בין משתמש רגיל למנהל.
// PATCH /api/admin/users/:id/role
router.patch("/:id/role", async (req, res) => {
  if (!idIsValid(req.params.id)) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  const { error, value } = roleSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      message: "Role must be user or admin",
    });
  }

  // בדיקה זמנית: זיהוי החשבון המחובר והמשתמש שמנסים לערוך.
  // מדפיסים רק האם המזהים זהים כדי להימנע מחשיפת מידע.
  const isOwnAccount =
    req.adminId === `user:${req.params.id}`;


  // הגנה מפני הסרת הרשאת מנהל מהחשבון המחובר.
  if (isOwnAccount && value.role !== "admin") {
    return res.status(403).json({
      message: "You cannot remove your own admin role",
    });
  }

  try {
    // עדכון הרשאת המשתמש במסד הנתונים.
    const user = await User.collection.findOneAndUpdate(
      { _id: asObjectId(req.params.id) },
      { $set: { role: value.role } },
      {
        returnDocument: "after",
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          createdAt: 1,
        },
      }
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json(publicUser(user));

  } catch (error) {
    return handleError(error, res);
  }
});

// מחיקה לצמיתות של משתמש רשום.
// DELETE /api/admin/users/:id
router.delete("/:id", async (req, res) => {
  if (!idIsValid(req.params.id)) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  // מניעת מחיקה של החשבון המחובר.
  if (req.adminId === `user:${req.params.id}`) {
    return res.status(403).json({
      message: "You cannot delete your own account",
    });
  }

  try {
    const id = asObjectId(req.params.id);

    // מחיקת המשתמש ממסד הנתונים.
    const deleted = await User.collection.findOneAndDelete({
      _id: id,
    });

    if (!deleted) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // מחיקת המועדפים השייכים למשתמש שנמחק בלבד.
    await mongoose.connection.db
      .collection("userfavorites")
      .deleteMany({
        $or: [
          { userId: id },
          { user: id },
        ],
      });

    return res.json({
      message: "User deleted",
    });

  } catch (error) {
    return handleError(error, res);
  }
});

module.exports = router;
