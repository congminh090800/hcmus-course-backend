const Joi = require("joi");

const schema = Joi.object().keys({
    courseId: Joi.string().required(),
    gradeComponentId: Joi.string().required(),
    grade: Joi.number().required(),
    userRequestId: Joi.string().required(),
    comment: Joi.string().optional(),
});

module.exports = schema;