import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBorrowerDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  whatsapp!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBorrowerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
