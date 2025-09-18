import joi from "joi";

export const addLecture = joi
  .object({
    title: joi.string().required(),
    description: joi.string().required(),
    price: joi.number().required(),
    year: joi.string().required(),
    order: joi.number().required(),
  })
  .required();
