/**
 * One-off backfill for the "cancelar" → "excluir" change.
 *
 * Contracts used to be cancelled: they stayed visible under a "Cancelados" tab
 * and could be reactivated. That tab is gone — cancelling is now deleting, and a
 * deleted contract disappears from the app entirely (soft delete via
 * Loan.deletedAt). Every contract that was already CANCELED is therefore
 * migrated to the new state, otherwise it would linger in the database as a
 * live-but-unreachable row that no screen can show and no tab can filter to.
 *
 * Also revokes their share links, so a URL handed out before this change stops
 * serving a contract the user considers gone.
 *
 * Safe to run more than once: rows already carrying a deletedAt are skipped.
 *
 * Run after `npm run db:push`:
 *   npx ts-node prisma/backfill-deleted-loans.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  const pending = await prisma.loan.findMany({
    where: { status: 'CANCELED', deletedAt: null },
    select: { id: true, canceledAt: true },
  });

  if (pending.length === 0) {
    console.log('Nada a migrar: nenhum contrato cancelado sem deletedAt.');
    return;
  }

  // Keep the original cancellation timestamp as the deletion date when there is
  // one — that is when the contract actually left the user's view.
  for (const loan of pending) {
    await prisma.loan.update({
      where: { id: loan.id },
      data: { deletedAt: loan.canceledAt ?? now },
    });
  }

  const revoked = await prisma.loanShare.updateMany({
    where: { loanId: { in: pending.map((l) => l.id) }, revokedAt: null },
    data: { revokedAt: now },
  });

  console.log(`Contratos cancelados migrados para excluídos: ${pending.length}`);
  console.log(`Links públicos revogados: ${revoked.count}`);
}

main()
  .catch((err) => {
    console.error('Backfill falhou:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
