// Super admin — mirrors the hard-coded checks from the original Next.js API routes.
export const SUPER_ADMIN_EMAIL = 'brunoantunes94@hotmail.com';

/**
 * How long a deleted account is kept before it is erased for good.
 *
 * The account stops working the moment the user deletes it; this window only
 * covers recovering from a mistake and answering disputes. It is stated verbatim
 * on the public /excluir-conta page, so changing it here means changing that
 * page too — the promise made to the user is the contract.
 */
export const ACCOUNT_RETENTION_DAYS = 90;
