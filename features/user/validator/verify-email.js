const Joi = require("joi");

const schema = Joi.object().keys({
    userId: Joi.string().required(),
});

module.exports = schema;
