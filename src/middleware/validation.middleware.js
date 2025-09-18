import { Types } from "mongoose";

export const objectId = (value, helpers) => {
  if (!Types.ObjectId.isValid(value)) {
    return helpers.error("ID invalid");
  }
  return value;
};

export const dateValidation = (value, helpers) => {
  // Convert string to Date if needed
  const date = typeof value === "string" ? new Date(value) : value;

  // Invalid date check
  if (
    Object.prototype.toString.call(date) !== "[object Date]" ||
    isNaN(date.getTime())
  ) {
    return helpers.error("any.invalid");
  }

  // Normalize to compare only year, month, day
  const inputDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  // Reject if date is before today
  if (inputDate < todayOnly) {
    return helpers.error("التاريخ يجب ان يكون أكبر من التاريخ الحالي");
  }

  return date;
};
export const validation = (schema, options = { lastErrorOnly: false }) => {
  return (req, res, next) => {
    const data = { ...req.body, ...req.params, ...req.query };

    const { error } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);

      const message = options.lastErrorOnly
        ? errorMessages.at(-1)
        : errorMessages[0];

      return next({
        status: 400,
        message: message.replace(/['"]/g, ""),
      });
    }

    return next();
  };
};
