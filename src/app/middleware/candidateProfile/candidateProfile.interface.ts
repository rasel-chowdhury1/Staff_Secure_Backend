import { Schema,  Document } from 'mongoose';

export interface ICandidateProfile extends Document {
  profileImage?: string;
  userId: Schema.Types.ObjectId; // Reference to User
  name: string;
  email: string;
  location: string;
  area: string;
  postalCode: string;
  county: string;
  designation: string;
  availability: string;
  dateOfBirth: Date;
  yearsOfExperience: number;
  qualifications: string[];
  skills: string[];
  bio: string;
  cv: string; // URL or file path to CV
  documentAndCertifications?: [string] ;
}
