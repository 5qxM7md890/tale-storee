import mongoose from 'mongoose';

const SlotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  productId: { type: String, index: true },
  productName: String,
  months: Number,
  guildId: { type: String, default: null, index: true },
  startsAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, index: true },
  status: { type: String, enum: ['active', 'expired', 'revoked'], default: 'active' }
}, { timestamps: true });

export const Slot = mongoose.model('Slot', SlotSchema);
