import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type CustomerDocument = HydratedDocument<Customer>;

@Schema({ timestamps: true, versionKey: '__v' })
export class Customer {
  @Prop({ required: true, minlength: 2, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  email!: string;

  @Prop({ lowercase: true, trim: true })
  emailCanonical!: string;

  @Prop({ required: true, default: 0, min: 0 })
  balance!: number;

  __v!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Pre-save hook: normalize name and generate emailCanonical
CustomerSchema.pre('save', function (next) {
  // Normalize name: trim and collapse internal whitespace
  if (this.name) {
    this.name = this.name.trim().replace(/\s+/g, ' ');
  }

  // Generate emailCanonical from email
  if (this.email) {
    this.email = this.email.trim();
    this.emailCanonical = this.email.toLowerCase();
  }

  next();
});

CustomerSchema.index({ emailCanonical: 1 }, { unique: true });
CustomerSchema.index({ name: 1 });
