import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLoanDto {
  @IsString()
  borrowerId!: string;

  @IsNumber()
  @Min(0.01)
  originalAmount!: number;

  // Optional: a single "à vista" loan (lend 100, receive 100) has 0% interest.
  @IsOptional()
  @IsNumber()
  @Min(0)
  interestRate?: number;

  @IsInt()
  @Min(1)
  installmentCount!: number;

  @IsString()
  startDate!: string;

  @IsOptional()
  @IsString()
  frequency?: string;
}
