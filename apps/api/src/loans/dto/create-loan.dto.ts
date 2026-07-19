import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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

  /**
   * The exact amount to receive, when the user typed it ("informar total").
   *
   * Without this the server can only re-derive the total from `interestRate`,
   * which is capped at 2 decimals — so a target of R$250 over 3 periods becomes
   * rate 8.33% and the total comes back 249,98. When the client knows the total
   * the user actually asked for, it sends it and that number wins.
   */
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  totalAmount?: number;

  @IsInt()
  @Min(1)
  installmentCount!: number;

  @IsString()
  startDate!: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  /**
   * Per-installment due dates (YYYY-MM-DD), when the user adjusted them. Length
   * must match `installmentCount`. Omitted → dates follow `frequency` from
   * `startDate`, as before.
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  dueDates?: string[];
}
