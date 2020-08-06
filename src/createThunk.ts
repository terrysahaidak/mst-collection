import {
  types as t,
  getRoot,
  Instance,
  getParent,
} from 'mobx-state-tree';
import { normalize, Schema } from 'normalizr';

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

      // eslint-disable-next-line no-undef
      // if (__DEV__) {
      //   // eslint-disable-next-line global-require
      //   const Reactotron = require('reactotron-react-native').default;
      //   const { message, stack } = err;
      //   if (stack) {
      //     Reactotron.error(message, stack);
      //   } else {
      //     Reactotron.log(`Error:\n${message}`);
      //   }
      // }

      if (store.inProgressRetry) {
        store.inProgressRetry = false;
      } else {
        store.inProgress = false;
      }

      // const response = err?.response;

      store.error = err;

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

    merge(collection: any, scheme: Schema) {
      const { result, entities } = normalize(collection, scheme);

      (getRoot(store) as any).entities.merge(entities);

      return {
        result,
      };
    },
  }));

export type Thunk<A extends any[], R> = (
  ...args: A
) => (flow: Instance<typeof asyncModel>) => R | undefined;

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
      const promise = () => fn.bind(getParent(store))(store);

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
