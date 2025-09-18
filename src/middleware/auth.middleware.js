import { User } from "../../DB/models/user.model.js";
import { Token } from "../../DB/models/token.model.js";
import { asyncHandler } from "./../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const auth = asyncHandler(async (req, res, next) => {
  let { token } = req.headers;

  if (!token) {
    return next(new Error("التوكن غير صالح", { cause: 401 }));
  }

  if (!token.startsWith(process.env.BEARER_TOKEN)) {
    return next(new Error("التوكن غير صالح", { cause: 401 }));
  }

  token = token.split(" ")[1];

  if (!token) {
    return next(new Error("التوكن غير صالح", { cause: 401 }));
  }

  if (!(await Token.findOne({ token }))) {
    return next(
      new Error("التوكن غير موجودة في قاعدة البيانات", { cause: 400 })
    );
  }

  const tokenDB = await Token.findOne({ token, isValid: true });

  if (!tokenDB) {
    return next(new Error("التوكن غير صالح", { cause: 400 }));
  }

  if (tokenDB.expiredAt < Date.now()) {
    tokenDB.isValid = false;
    await tokenDB.save();
    return next(new Error("التوكن غير صالح", { cause: 401 }));
  }

  const decoded = jwt.verify(token, process.env.SECRET_KEY);
  const user = await User.findById(decoded.id);
  req.user = user;
  req.token = token;
  next();
});
