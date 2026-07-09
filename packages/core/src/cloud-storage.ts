import {
  type AuthorizationStatus,
  CloudStorageClient,
  type ProgressEvent,
  type StoreResult,
  createLazySigner,
} from "@parity/product-sdk-cloud-storage";
import type { AccountsController } from "./accounts";
import type { AnyChains, TruapiConfig } from "./config";

export type { AuthorizationStatus, ProgressEvent, StoreResult };

export interface UploadOptions {
  chunkSize?: number;
  onProgress?: (event: ProgressEvent) => void;
}

export interface CloudStorageController {
  /** Client is created lazily on first use; requires `config.cloudStorage`. */
  getClient(): Promise<CloudStorageClient>;
  upload(data: Uint8Array, options?: UploadOptions): Promise<StoreResult>;
  fetchBytes(cid: string): Promise<Uint8Array>;
  fetchJson<T>(cid: string): Promise<T>;
  checkAuthorization(address?: string): Promise<AuthorizationStatus>;
}

export function createCloudStorageController<TChains extends AnyChains>(
  config: TruapiConfig<TChains>,
  accounts: AccountsController,
): CloudStorageController {
  let clientPromise: Promise<CloudStorageClient> | null = null;

  const getClient = (): Promise<CloudStorageClient> => {
    if (!clientPromise) {
      const environment = config.cloudStorage?.environment;
      if (!environment) {
        return Promise.reject(
          new Error(
            "use-truapi: add `cloudStorage: { environment }` to the config to use cloud storage",
          ),
        );
      }
      clientPromise = CloudStorageClient.create({
        environment,
        // Resolved at signing time so uploads can start before connect().
        signer: createLazySigner(
          () => accounts.getSigner(),
          "use-truapi: connect an account before uploading to cloud storage",
        ),
      });
      clientPromise.catch(() => {
        clientPromise = null;
      });
    }
    return clientPromise;
  };

  return {
    getClient,
    upload: async (data, options) => {
      const client = await getClient();
      let builder = client.store(data);
      if (options?.chunkSize) builder = builder.withChunkSize(options.chunkSize);
      if (options?.onProgress) builder = builder.withCallback(options.onProgress);
      return builder.send();
    },
    fetchBytes: async (cid) => (await getClient()).fetchBytes(cid),
    fetchJson: async (cid) => (await getClient()).fetchJson(cid),
    checkAuthorization: async (address) => {
      const client = await getClient();
      const target = address ?? accounts.state.get().selectedAccount?.address;
      if (!target) throw new Error("use-truapi: no address to check authorization for");
      return client.checkAuthorization(target);
    },
  };
}
