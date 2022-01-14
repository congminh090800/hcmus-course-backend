const Joi = require("joi");

const schema = Joi.object().keys({
    courseId: Joi.string().required(),
    gradeComponentId: Joi.string().required(),
    studentId: Joi.string().optional(),
});

module.exports = schema;