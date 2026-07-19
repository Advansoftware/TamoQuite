import 'package:flutter/material.dart';

import '../../domain/loan.dart';

/// Confirmação de exclusão de contrato.
///
/// O texto é enfático de propósito: para o usuário isto é irreversível (não há
/// rota de restauração — ver `loans.service.ts#remove`), ainda que no banco
/// seja um soft delete guardado só para auditoria.
Future<bool> showDeleteLoanDialog(BuildContext context, Loan loan) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (context) {
      final theme = Theme.of(context);
      return AlertDialog(
        title: Text(
          'Excluir contrato',
          style: TextStyle(color: theme.colorScheme.error),
        ),
        content: Text(
          'Excluir o contrato de ${loan.borrower.name}? Ele some junto com as '
          'parcelas e as cobranças, para de ser cobrado e deixa de contar nos '
          'seus totais. Esta ação não pode ser desfeita.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Voltar'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: theme.colorScheme.error),
            child: const Text('Excluir contrato'),
          ),
        ],
      );
    },
  );
  return confirmed ?? false;
}
