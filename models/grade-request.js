const mongoose = require("mongoose");
const { Schema } = mongoose;

const gradeRequestSchema = new Schema(
    {
        courseId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "Course",
        },
        userRequestId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        gradeComponentId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        expectedGrade: {
            type: Number,
            required: true,
        },
        explanation: {
            type: String,
            default: "",
        },
        finalGrade: Number,
        comment: String,
        deleted_flag: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const GradeRequest = mongoose.model("GradeRequest", gradeRequestSchema);
module.exports = GradeRequest;
