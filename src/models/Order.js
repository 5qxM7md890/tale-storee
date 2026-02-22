import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  stripeSessionId: { type: String, unique: true, index: true },
  amountTotal: Number,
  currency: String,
  items: [{
    productId: String,
    name: String,
    months: Number,
    quantity: Number,
    unitAmountCents: Number,
    lineAmountCents: Number
  }],
  status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' }
}, { timestamps: true });

export const Order = mongoose.model('Order', OrderSchema);
