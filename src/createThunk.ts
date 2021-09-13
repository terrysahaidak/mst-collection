import {
  getParent,
  getRoot,
  Instance,
  types as t,
} from 'mobx-state-tree';
import { normalize, Schema } from 'normalizr';
import { MergeStrategyType } from './CollectionModel';

let onErrorCallback: (err: unknown) => void;

export const asyncModel = t
  .model({
    inProgress: false,
    inProgressRetry: false,
    error: t.optional(t.frozen(), null),
    hasEverBeenRun: false,
    throwable: false,
  })
  .views((store) => ({
    get errorMessage() {
      if (store.error && store.error.message) {
        return store.error && store.error.message;
      }

      return null;
    },

    get isError() {
      return Boolean(store.error);
    },

    get canBeRun() {
      return !store.error && !store.inProgress;
    },

    get inProgressAgain() {
      return store.inProgress && store.hasEverBeenRun;
    },
  }))
  .actions((store) => ({
    start(retry = false) {
      if (retry) {
        store.inProgressRetry = true;
      } else {
        store.inProgress = true;
      }

      store.error = null;
    },

    success() {
      if (!store.hasEverBeenRun) {
        store.hasEverBeenRun = true;
      }

      if (store.inProgressRetry) {
        store.inProgressRetry = false;
      } else {
        store.inProgress = false;
      }
    },

    failed(err: Error, throwError = store.throwable) {
      if (!store.hasEverBeenRun) {
        store.hasEverBeenRun = true;
      }

      if (store.inProgressRetry) {
        store.inProgressRetry = false;
      } else {
        store.inProgress = false;
      }

      // @ts-ignore
      const response = err?.response;
      if (response) {
        store.error = {
          message: response?.data?.message ?? err.message,
          status: response?.status ?? null,
          statusText: response?.statusText ?? null,
          reason: response?.data?.reason ?? null,
          errorCode: response?.data?.error ?? response?.code,
          meta: response?.data?.meta ?? null,
        };
      } else {
        store.error = err;
      }

      if (onErrorCallback) {
        onErrorCallback(err);
      }

      if (throwError) {
        throw err;
      }
    },

    normalize(collection: any, scheme: Schema) {
      return normalize(collection, scheme);
    },

    throwError(value: boolean) {
      store.throwable = value;
    },

    merge(
      collection: any,
      scheme: Schema,
      mergeStrategy?: MergeStrategyType,
    ) {
      const { result, entities } = normalize(collection, scheme);

      (getRoot(store) as any).entities.merge(entities, mergeStrategy);

      return {
        result,
      };
    },
  }));

type AsyncAction<R> = (
  flow: Instance<typeof asyncModel>,
) => R | undefined;

type ShouldSkipCheck = (flow: Instance<typeof asyncModel>) => boolean;

export type Thunk<A extends any[], R> = (
  ...args: A
) => AsyncAction<R> | [ShouldSkipCheck, AsyncAction<R>];

export function createThunk<A extends any[], R>(
  thunk: Thunk<A, R>,
  auto = true,
  throwError = auto,
) {
  const thunkModel = asyncModel.named('thunk').actions((store) => ({
    async auto<R>(promise: any): Promise<R | undefined> {
      try {
        store.start();

        const value = await promise();

        store.success();

        return value;
      } catch (err) {
        store.failed(err, throwError);
      }

      return undefined;
    },

    run: function run<
      T extends (
        ...args: A
      ) => (flow: Instance<typeof asyncModel>) => R | undefined
    >(...args: Parameters<T>): R | undefined {
      const fn = thunk(...args);

      let promise: () => R | undefined;

      if (Array.isArray(fn)) {
        const [check, actualThunk] = fn;

        const shouldSkip = check.bind(getParent(store))(store);

        if (shouldSkip) {
          return undefined;
        }

        promise = () => actualThunk.bind(getParent(store))(store);
      } else {
        promise = () => fn.bind(getParent(store))(store);
      }

      if (auto) {
        // @ts-ignore
        return this.auto<R>(promise);
      }

      return promise();
    },
  }));

  return (t.optional(thunkModel, {}) as any) as Instance<
    typeof thunkModel
  >;
}

// Just a nicer API so we don't need to pass false, false
export function createManualThunk<A extends any[], R>(
  thunk: Thunk<A, R>,
) {
  return createThunk<A, R>(thunk, false, false);
}

/**
 * Sets a callback to be executed each time we call asyncModel.failed
 * Useful if you want to log errors
 *
 * @export
 * @param {(err: unknown) => void} cb - callback to be executed on each failed call
 */
export function setOnThunkErrorCallback(cb: (err: unknown) => void) {
  onErrorCallback = cb;
}
