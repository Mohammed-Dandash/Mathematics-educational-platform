export const asyncHandler = (asynchandler) => {
  return (req, res, next) => {
    asynchandler(req, res, next).catch((error) => {
      next(error);
    });
  };
};
