import 'server-only';
import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob';

export const VOICE_NOTES_CONTAINER = 'voice-notes';

let blobServiceClient: BlobServiceClient | null = null;

export function getBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set in environment');
  }
  if (!blobServiceClient) {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return blobServiceClient;
}

export function getVoiceNotesContainerClient() {
  const serviceClient = getBlobServiceClient();
  return serviceClient.getContainerClient(VOICE_NOTES_CONTAINER);
}

export interface UploadVoiceBlobOptions {
  userId: string;
  noteId: string;
  extension: string;
  buffer: Buffer | Uint8Array;
  contentType?: string;
}

export async function uploadVoiceNoteBlob({
  userId,
  noteId,
  extension,
  buffer,
  contentType,
}: UploadVoiceBlobOptions): Promise<{ blobName: string; blobUrl: string; sasUrl: string }> {
  const ext = extension.replace(/^\./, '').toLowerCase();
  const blobName = `${userId}/${noteId}.${ext}`;
  const container = getVoiceNotesContainerClient();
  await container.createIfNotExists();
  const blockBlobClient = container.getBlockBlobClient(blobName);

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: {
      blobContentType: contentType || 'audio/webm',
    },
  });

  const expiresOn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day initial SAS
  const sasUrl = await blockBlobClient.generateSasUrl({
    permissions: BlobSASPermissions.parse('r'),
    expiresOn,
  });

  return {
    blobName,
    blobUrl: blockBlobClient.url,
    sasUrl,
  };
}

export async function deleteVoiceNoteBlob(
  userId: string,
  noteId: string,
  extension?: string
): Promise<boolean> {
  const container = getVoiceNotesContainerClient();
  if (extension) {
    const ext = extension.replace(/^\./, '').toLowerCase();
    const blobName = `${userId}/${noteId}.${ext}`;
    const blobClient = container.getBlobClient(blobName);
    const res = await blobClient.deleteIfExists();
    return res.succeeded;
  }

  let deletedAny = false;
  const prefix = `${userId}/${noteId}`;
  for await (const blob of container.listBlobsFlat({ prefix })) {
    const blobClient = container.getBlobClient(blob.name);
    const res = await blobClient.deleteIfExists();
    if (res.succeeded) deletedAny = true;
  }
  return deletedAny;
}

export async function getVoiceNoteReadSasUrl(
  blobNameOrUrl: string,
  expiresInMinutes: number = 60
): Promise<string> {
  const container = getVoiceNotesContainerClient();
  let blobName = blobNameOrUrl;
  if (blobNameOrUrl.startsWith('http://') || blobNameOrUrl.startsWith('https://')) {
    try {
      const url = new URL(blobNameOrUrl);
      const pathParts = url.pathname.replace(/^\/+/, '').split('/');
      if (pathParts[0] === VOICE_NOTES_CONTAINER) {
        blobName = pathParts.slice(1).join('/');
      } else {
        blobName = pathParts.join('/');
      }
    } catch {
      // keep blobName as is
    }
  }

  const blobClient = container.getBlobClient(blobName);
  const expiresOn = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  return blobClient.generateSasUrl({
    permissions: BlobSASPermissions.parse('r'),
    expiresOn,
  });
}

export async function getVoiceNoteUploadSasUrl(
  userId: string,
  noteId: string,
  extension: string,
  expiresInMinutes: number = 30
): Promise<{ blobName: string; uploadSasUrl: string }> {
  const ext = extension.replace(/^\./, '').toLowerCase();
  const blobName = `${userId}/${noteId}.${ext}`;
  const container = getVoiceNotesContainerClient();
  await container.createIfNotExists();
  const blobClient = container.getBlockBlobClient(blobName);
  const expiresOn = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const uploadSasUrl = await blobClient.generateSasUrl({
    permissions: BlobSASPermissions.parse('rcw'),
    expiresOn,
  });

  return { blobName, uploadSasUrl };
}
