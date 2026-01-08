import joi from "joi";

export const addLecture = joi
  .object({
    title: joi.string().required(),
    description: joi.string().required(),
    price: joi.number().required(),
    branch: joi.string().hex().length(24).required(),
    order: joi.number().required(),
  })
  .required();
