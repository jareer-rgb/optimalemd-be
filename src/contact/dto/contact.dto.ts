import { IsString, IsEmail, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}

export class ContactResponseDto {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UpdateContactStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string; // new, read, replied
}
