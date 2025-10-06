import { Model, ObjectId, Schema, Types } from 'mongoose';


export interface TUserCreate {
  name?: string;
  companyName?: string;
  email: string;
  password: string;
  profileImage: string;
  role: string;
  phone?: string;
  candidateProfileId?: Types.ObjectId,
  mySubscriptionsId?: Types.ObjectId,
  stipeCustomerId?: string,
  location?: string,
  area? : string,
  postalCode?: string,
  county?: string,
  designation?: string,
  dateOfBirth?: Date,
  yearsOfExperience?: number,
  qualifications?: string[],
  skills?: string[],
  bio?: string,
  cv?: string,
  status: string;
  isDeleted: boolean;
  acceptTerms: boolean;
}

export interface TUser extends TUserCreate {
  _id: string;
}

export interface DeleteAccountPayload {
  password: string;
}

export interface UserModel extends Model<TUser> {
  isUserExist(email: string): Promise<TUser>;
  
  isUserActive(email: string): Promise<TUser>;

  IsUserExistById(id: string): Promise<TUser>;

  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
}

