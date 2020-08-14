import { MergeStrategyType } from './CollectionModel';
/* eslint-disable @typescript-eslint/ban-types */
import {
  IAnyModelType,
  IOptionalIType,
  ModelProperties,
} from 'mobx-state-tree';
import { normalize, Schema } from 'normalizr';
import { ExtendedModel, Model, _Model } from './Model';
import { optionateModels } from './utils';

type ICollections = {
  [k: string]: IAnyModelType;
};

interface EntitiesModelClass {
  merge(
    normalizedEntities: { [key: string]: object },
    mergeStrategy: MergeStrategyType,
  ): void;

  normalizeMerge<T>(data: any, schema: Schema): T;
}

function createEntitiesStore<
  T extends ICollections,
  Keys extends Extract<keyof T, string>
>(collections: T) {
  type OptionatedCollections = {
    [K in Keys]: IOptionalIType<T[K], T[K]['SnapshotType']>;
  };

  const optionalModels = optionateModels<OptionatedCollections>(
    collections,
  );

  class Entities extends Model(optionalModels as ModelProperties) {
    merge(
      normalizedEntities: { [key: string]: object },
      mergeStrategy: MergeStrategyType = 'assign',
    ) {
      Object.entries(normalizedEntities).forEach(
        ([key, normalizedEntity]) => {
          const storeEntity = this[key] as any;

          if (!storeEntity) {
            return;
          }

          Object.entries(normalizedEntity).forEach(
            ([nestedKey, value]) => {
              if (storeEntity.has(nestedKey)) {
                storeEntity.update(nestedKey, value, mergeStrategy);
              } else {
                storeEntity.collection.set(String(nestedKey), value);
              }
            },
          );
        },
      );
    }

    normalizeMerge(data: any, schema: Schema) {
      const { result, entities } = normalize(data, schema);

      this.merge(entities);

      return result;
    }
  }

  return (Entities as any) as _Model<
    OptionatedCollections,
    EntitiesModelClass
  >;
}

export function EntitiesModel<T extends ICollections>(
  collections: T,
) {
  const entitiesStore = createEntitiesStore(collections);

  return ExtendedModel(entitiesStore, {});
}
