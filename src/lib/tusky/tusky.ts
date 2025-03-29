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

/**
 * Lists files in a vault with pagination support
 * @param client - Tusky client instance
 * @param options - List files options
 * @returns Array of files
 */
export async function listFiles(client: TuskyClientType, options: {
  vaultId?: string;
  parentId?: string;
  uploadId?: string;
  status?: 'active' | 'revoked' | 'deleted';
  limit?: number;
  nextToken?: string;
}) {
  try {
    logger.info('[Vault] Listing files', { options });
    
    // List files with provided options
    const files = await client.file.list(options);
    
    logger.info('[Vault] Files retrieved successfully', { 
      count: files.items?.length || 0,
      hasMore: !!files.nextToken
    });
    
    // サポートされている形式のレスポンスに対応
    if (Array.isArray(files)) {
      return { items: files, nextToken: null };
    } else if (files.items && Array.isArray(files.items)) {
      return { items: files.items, nextToken: files.nextToken };
    } else if (files.data && Array.isArray(files.data)) {
      return { items: files.data, nextToken: files.nextToken };
    }
    
    // 何も見つからなかった場合は空の結果を返す
    logger.warn('[Vault] Could not determine files structure, returning empty array');
    return { items: [], nextToken: null };
  } catch (error) {
    logger.error('[Vault] Failed to list files', { error, options });
    throw error;
  }
}

/**
 * Lists all files for the current user across all vaults
 * @param client - Tusky client instance
 * @returns All files for the user
 */
export async function listAllFiles(client: TuskyClientType) {
  try {
    logger.info('[Vault] Listing all files for user');
    
    // List all files using the client's listAll method
    const files = await client.file.listAll();
    
    logger.info('[Vault] All files retrieved successfully', { 
      count: files.items?.length || 0
    });
    
    // サポートされている形式のレスポンスに対応
    if (Array.isArray(files)) {
      return { items: files, nextToken: null };
    } else if (files.items && Array.isArray(files.items)) {
      return { items: files.items, nextToken: files.nextToken };
    }
    
    // 何も見つからなかった場合は空の結果を返す
    logger.warn('[Vault] Could not determine files structure, returning empty array');
    return { items: [], nextToken: null };
  } catch (error) {
    logger.error('[Vault] Failed to list all files', { error });
    throw error;
  }
}

/**
 * Retrieves file details
 * @param client - Tusky client instance
 * @param fileId - ID of the file
 * @returns File details
 */
export async function getFile(client: TuskyClientType, fileId: string) {
  try {
    logger.info('[Vault] Getting file details', { fileId });
    
    // Get file details
    const file = await client.file.get(fileId);
    
    logger.info('[Vault] File details retrieved successfully', { fileId });
    
    return file;
  } catch (error) {
    logger.error('[Vault] Failed to get file details', { error, fileId });
    throw error;
  }
}

/**
 * Downloads a file
 * @param client - Tusky client instance
 * @param fileId - ID of the file to download
 * @returns File data
 */
export async function downloadFile(client: TuskyClientType, fileId: string) {
  try {
    logger.info('[Vault] Downloading file', { fileId });

    // Download the file
    const fileData = await client.file.download(fileId);

    logger.info('[Vault] File downloaded successfully', { fileId });

    return fileData;
  } catch (error) {
    logger.error('[Vault] Failed to download file', { error, fileId });
    throw error;
  }
}

/**
 * Deletes a file
 * @param client - Tusky client instance
 * @param fileId - ID of the file to delete
 * @returns Success status
 */
export async function deleteFile(client: TuskyClientType, fileId: string) {
  try {
    logger.info('[Vault] Deleting file', { fileId });
    
    // Delete the file
    await client.file.delete(fileId);
    
    logger.info('[Vault] File deleted successfully', { fileId });
    
    return true;
  } catch (error) {
    logger.error('[Vault] Failed to delete file', { error, fileId });
    throw error;
  }
}
