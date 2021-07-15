const mongoose = require("mongoose");
let mongooseHidden = require("mongoose-hidden")();

const userSchema = new mongoose.Schema({
  userName: { type: String },
  accountNumber: { type: String },
  emailAddress: { type: String, unique: true },
  identityNumber: { type: String },
  accessToken: { type: String }
});

userSchema.plugin(mongooseHidden);
module.exports = mongoose.model("user", userSchema);
