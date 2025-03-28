import { logger } from "@/lib/logger";
import type { TuskyClientType } from "@/lib/tusky/client";

/**
 * Sets up encryption for Tusky client using password
 * @param client - Tusky client instance
 * @param password - User password for encryption
 * @returns Setup result
 */
export async function setupEncryption(client: TuskyClientType, password: string) {
  try {
    logger.info('[Vault] Setting up encryption with password');
    
    // Setup encryption with password
    const result = await client.addEncrypter({ password });
    
    logger.info('[Vault] Encryption setup successful');
    
    return result;
  } catch (error) {
    // If user has no keys yet, set up password
    if (error instanceof Error && error.message.includes('No keys found')) {
      logger.info('[Vault] No keys found, setting up password');
      const { user, keypair } = await client.me.setupPassword(password);
      await client.addEncrypter({ keypair });
      return { user, keypair };
    }
    
    logger.error('[Vault] Failed to setup encryption', { error });
    throw error;
  }
}

/**
 * Creates a private encrypted vault in Tusky
 * @param client - Tusky client instance
 * @param name - Name of the vault
 * @param password - Optional password for encryption (if not already set up)
 * @returns The created vault ID and name, or null if creation failed
 */
export async function createPrivateVault(client: TuskyClientType, name: string, password?: string) {
  try {
    logger.info('[Vault] Creating private vault', { name });
    
    // If password is provided, make sure encryption is set up
    if (password) {
      await setupEncryption(client, password);
    }
    
    // Create a private encrypted vault
    // By default vault.create creates a private encrypted vault
    const { id, name: vaultName } = await client.vault.create(name);
    
    logger.info('[Vault] Private vault created successfully', { id, name: vaultName });
    
    return { id, name: vaultName };
  } catch (error) {
    logger.error('[Vault] Failed to create private vault', { error });
    throw error;
  }
}

/**
 * Lists all vaults for the current user
 * @param client - Tusky client instance
 * @returns Array of vaults
 */
export async function listVaults(client: TuskyClientType) {
  try {
    logger.info('[Vault] Listing all vaults');
    
    // List all vaults
    const vaults = await client.vault.list();

    logger.info('[Vault] Vaults retrieved successfully', { vaults });
    
    logger.info('[Vault] Vaults retrieved successfully', { count: vaults.items?.length || 0 });
    
    return vaults.items || [];
  } catch (error) {
    logger.error('[Vault] Failed to list vaults', { error });
    throw error;
  }
}

/**
 * Gets details of a specific vault
 * @param client - Tusky client instance
 * @param vaultId - ID of the vault
 * @returns Vault details
 */
export async function getVault(client: TuskyClientType, vaultId: string) {
  try {
    logger.info('[Vault] Getting vault details', { vaultId });
    
    // Get vault details
    const vault = await client.vault.get(vaultId);
    
    logger.info('[Vault] Vault details retrieved successfully', { vaultId });
    
    return vault;
  } catch (error) {
    logger.error('[Vault] Failed to get vault details', { error, vaultId });
    throw error;
  }
}

/**
 * Uploads a file to a vault
 * @param client - Tusky client instance
 * @param vaultId - ID of the vault
 * @param file - File to upload
 * @returns Upload ID
 */
export async function uploadFileToVault(client: TuskyClientType, vaultId: string, file: File) {
  try {
    logger.info('[Vault] Uploading file to vault', { vaultId, fileName: file.name });
    
    // Upload file to the vault
    const uploadId = await client.file.upload(vaultId, file);
    
    logger.info('[Vault] File uploaded successfully', { uploadId, vaultId });
    
    return uploadId;
  } catch (error) {
    logger.error('[Vault] Failed to upload file', { error, vaultId });
    throw error;
  }
}
