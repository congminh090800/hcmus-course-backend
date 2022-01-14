const mongoose = require("mongoose");
const { id } = require("../features/course/validator/create");
const Course = require("../models/course");

module.exports = async (req, res, next) => {
    const userId = req.user.id;
    const courseId = req.body.courseId || req.query.courseId;

    try {
        const course = await Course.findById(courseId);

        if (!course) {
            return res.badRequest("Class does not exist", "CLASS_NOT_EXISTS");
        }

        if (course.owner.equals(userId) || course.teachers.some(id => id.equals(userId))) {
            req.course = course;
            next();
        } else {
            return res.forbidden("Forbiden", "NO_PERMISSION_USER");
        }
    } catch (err) {
        return res.badRequest(err.message);
    }
}