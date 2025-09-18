import joi from "joi";

export const addAccount = joi.object({
  username: joi.string().required(),
  email: joi.string().email().required(),
  role: joi.string().valid("admin", "assistant").required(),
  password: joi.string().required(),
  confirmPassword: joi.string().required().valid(joi.ref("password")),
});

export const login = joi.object({
  email: joi.string().email().required(),
  password: joi.string().required(),
});

export const forgetCode = joi.object({
  email: joi.string().email().required(),
});

export const resetPassword = joi.object({
  code: joi.string().required(),
  password: joi.string().required(),
  confirmPassword: joi.string().required().valid(joi.ref("password")),
});
