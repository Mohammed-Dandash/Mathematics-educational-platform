import joi from "joi";

// export const addExam = joi.object({
//   lectureId: joi.string().required(),
//   questions: joi
//     .array()
//     .items(
//       joi.object({
//         question: joi.string().required(),
//         wrongAnswers: joi.array().items(joi.string()).min(2).required(),
//         correctAnswer: joi.string().required(),
//       })
//     )
//     .min(1)
//     .required(),
// });

export const submitExam = joi.object({
  examId: joi.string().required(),
  answers: joi
    .array()
    .items(
      joi.object({
        question: joi.string().required(),
        chosenAnswer: joi.string().required(),
      })
    )
    .min(1)
    .required(),
});
