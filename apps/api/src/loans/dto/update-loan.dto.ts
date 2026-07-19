import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Corrects a contract that was typed wrong. Every field is optional — only what
 * the user actually changed is sent, and anything omitted keeps its value.
 *
 * The money fields rebuild the parcelas, so the service refuses them once a
 * parcela has been paid (see LoansService.update). `borrowerId` is the exception:
 * pointing a contract at the right person never touches the schedule.
 */
export class UpdateLoanDto {
  @IsOptional()
  @IsString()
  borrowerId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  originalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  interestRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  totalAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  installmentCount?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  /** Per-installment due dates (YYYY-MM-DD). Length must match the final count. */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  dueDates?: string[];
}
