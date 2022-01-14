const Joi = require("joi");

const schema = Joi.object().keys({
    courseId: Joi.string().required(),
    gradeComponentId: Joi.string().required(),
    userRequestId: Joi.string().required(),
    comment: Joi.string().optional(),
});

module.exports = schema;