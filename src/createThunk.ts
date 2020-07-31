import {
  types as t,
  getRoot,
  Instance,
  getParent,
} from 'mobx-state-tree';
import { normalize, Schema } from 'normalizr';

const ErrorModel = t.model({
  message: '',
  status: t.maybeNull(t.number),
  reason: t.maybeNull(t.string),
  errorCode: t.maybeNull(t.string),
  meta: t.maybeNull(t.frozen({})),
});

export const asyncModel = t
  .model({
    inProgress: false,
    inProgressRetry: false,
    error: t.optional(t.maybeNull(ErrorModel), null),
    hasEverBeenRan: false,
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
      return store.inProgress && store.hasEverBeenRan;
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
      if (!store.hasEverBeenRan) {
        store.hasEverBeenRan = true;
      }

      if (store.inProgressRetry) {
        store.inProgressRetry = false;
      } else {
        store.inProgress = false;
      }
    },

    failed(err: Error, throwError = store.throwable) {
      if (!store.hasEverBeenRan) {
        store.hasEverBeenRan = true;
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

      // store.error = {
      //   message: response?.data?.message ?? err?.message,
      //   status: response?.status ?? null,
      //   reason: response?.data?.reason ?? null,
      //   errorCode: response?.data?.error ?? null,
      //   meta: response?.data?.meta ?? null,
      // };

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

export type Thunk<A extends any[]> = (
  ...args: A
) => (flow: Instance<typeof asyncModel>) => any;

export function createThunk<A extends any[]>(
  thunk: Thunk<A>,
  auto = true,
  throwError = auto,
) {
  const thunkModel = asyncModel.named('thunk').actions((store) => ({
    async auto<T extends () => Promise<any>>(promise: T) {
      try {
        store.start();

        await promise();

        store.success();
      } catch (err) {
        store.failed(err, throwError);
      }
    },

    run: function run<T extends (...args: A) => 
      (flow: Instance<typeof asyncModel>) => any, R extends Promise<any>>(
        ...args: Parameters<T>
      ): R {
      const fn = thunk(...args)
      const promise = () => fn.bind(getParent(store))(store);

      if (auto) {
        return this.auto(promise) as R;
      }

      return promise();
    },
  }));

  return (t.optional(thunkModel, {}) as any) as Instance<typeof thunkModel>;
}
