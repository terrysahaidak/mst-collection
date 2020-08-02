import { types } from 'mobx-state-tree';

export function optionateModels<T>(models: object): T {
  const optionalModels = Object.entries(models).reduce(
    (acc, [key, value]) => {
      // @ts-ignore
      acc[key] = types.optional(value, {});

      return acc;
    },
    {},
  ) as T;

  return optionalModels;
}
