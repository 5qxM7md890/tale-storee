import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  discordId: { type: String, unique: true, index: true },
  username: String,
  globalName: String,
  avatar: String,
  email: String,
  accessToken: String,
  tokenType: String,
  scope: String,
  tokenCreatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);
