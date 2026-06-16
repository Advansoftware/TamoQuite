import { db } from './src/lib/db';

async function main() {
  const users = await db.systemUser.findMany();
  console.log('--- Users ---');
  console.log(users);

  const loans = await db.loan.findMany();
  console.log('--- Loans ---');
  console.log(loans);

  const installments = await db.installment.findMany();
  console.log('--- Installments ---');
  console.log('Total count:', installments.length);
  for (const inst of installments) {
    console.log(`Inst ID: ${inst.id}, LoanID: ${inst.loanId}, Num: ${inst.installmentNumber}, Amount: ${inst.amount}, Paid: ${inst.paidAmount}, Status: ${inst.status}, DueDate: ${inst.dueDate.toISOString()}, PaidAt: ${inst.paidAt?.toISOString()}`);
  }
}

main().catch(console.error);
