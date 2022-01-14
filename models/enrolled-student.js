const mongoose = require("mongoose");
const { Schema } = mongoose;

const gradeSchema = new Schema({
  point: {
    type: Number,
    default: 0,
  },
  gradeComponentId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  inReview: {
    type: Boolean,
  }
}, { _id: false });

const enrolledStudentSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      min: 3,
    },
    studentId: {
      type: String,
      required: true,
      unique: true
    },
    courseId: {
      type: Schema.Types.ObjectId,
    },
    grades: {
      type: [gradeSchema],
      default: [],
    },
    deleted_flag: { type: Boolean, default: false },
  },
  { timestamps: true }
);
// const EnrolledStudent = mongoose.model(
//   "EnrolledStudent",
//   enrolledStudentSchema
// );
module.exports = {
  gradeSchema,
  enrolledStudentSchema,
};
