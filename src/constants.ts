export const REQUIRED_MODULES = ['child_process', 'fs', 'util'];

export const START_MARKER = '// === START: 1Password Secret Management ===';
export const END_MARKER = '// === END: 1Password Secret Management ===';

export const OP_SECRETS_EXPIRED_AT_VAR = 'OP_SECRETS_EXPIRED_AT';
export const OP_SECRETS_EXPIRED_AT_DESCRIPTION =
    'Managed by op-bruno: tracks when cached 1Password secrets expire so they can be refetched. Not a real secret value.';
