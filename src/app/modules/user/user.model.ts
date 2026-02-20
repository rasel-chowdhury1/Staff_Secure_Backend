import bcrypt from 'bcrypt';
import { Error, model, Schema } from 'mongoose';
import config from '../../config';
import { TUser, UserModel } from './user.interface';
import { USER_ROLE } from './user.constants';

const userSchema = new Schema<TUser>(
  {
    name: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    profileImage: {
      type: String,
      default: '',
    },

    role: {
      type: String,
      enum: [USER_ROLE.CANDIDATE, USER_ROLE.EMPLOYER,USER_ROLE.ADMIN],
    },

    companyName: {
      type: String,
      default: '',
    },
    
    phone: {
      type: String,
      default: ""
    },
    candidateProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'CandidateProfile',
      default: null,
    },
    mySubscriptionsId: {
      type: Schema.Types.ObjectId,
      ref: "MySubscription",
    },
    stipeCustomerId: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ['active', 'blocked'],
      default: "active",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

userSchema.pre('save', async function (next) {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const user = this;
  // user.password = await bcrypt.hash(
  //   user.password,
  //   Number(config.bcrypt_salt_rounds),
  // );

  if (user.isModified('password') && user.password) {
    user.password = await bcrypt.hash(
      user.password,
      Number(config.bcrypt_salt_rounds),
    );
  }
  next();
});

// set '' after saving password
userSchema.post(
  'save',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function (error: Error, doc: any, next: (error?: Error) => void): void {
    doc.password = '';
    next();
  },
);

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password; // Remove password field
  return user;
};

// filter out deleted documents
userSchema.pre('find', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

userSchema.pre('findOne', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

userSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  next();
});

userSchema.statics.isUserExist = async function (email: string) {
  
  return await User.findOne({ email: email }).select('+password');
};

userSchema.statics.isUserActive = async function (email: string) {
  return await User.findOne({
    email: email,
    status: 'active',
    isDeleted: false
  }).select('+password');
};

userSchema.statics.IsUserExistById = async function (id: string) {
  return await User.findById(id).select('+password');
};

userSchema.statics.isPasswordMatched = async function (
  plainTextPassword,
  hashedPassword,
) {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

export const User = model<TUser, UserModel>('User', userSchema);
