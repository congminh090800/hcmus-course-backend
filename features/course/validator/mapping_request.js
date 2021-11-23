const Joi = require("joi");

const schema = Joi.object().keys({
    courseId: Joi.string().required(),
    studentId: Joi.string().min(6).required(),
    message: Joi.string().optional(),
});

module.exports = schema;