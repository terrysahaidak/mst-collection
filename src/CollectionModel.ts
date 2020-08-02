import {
  types,
  IAnyModelType,
  getIdentifier,
  IMapType,
  Instance,
} from 'mobx-state-tree';
import { ExtendedModel, Model, _Model, view } from './Model';

type Id = string | number;

interface IBaseCollection<T extends IAnyModelType> {
  get(id: Id): T['Type'] | undefined;

  has(id: Id): boolean;

  find(callback: (item: T) => T | undefined): T['Type'] | undefined;

  add(id: Id, value: Instance<T>): void;

  destroy(item: T): void;

  update(id: Id, value: T): void;
}

const createCollectionStore = <T extends IAnyModelType>(
  modelForCollection: T,
): _Model<
  {
    collection: IMapType<T>;
  },
  IBaseCollection<T>
> => {
  class Collection extends Model({
    collection: types.map(modelForCollection),
  }) {
    @view get(id: Id) {
      return this.collection.get(String(id));
    }

    @view has(id: Id) {
      return this.collection.has(String(id));
    }

    find(callback: (item: T) => T | undefined) {
      return Array.from(this.collection.values()).find(callback);
    }

    add(id: Id, value: Instance<T>) {
      this.collection.set(String(id), value);
    }

    destroy(item: T) {
      const id = getIdentifier(item);
      this.collection.delete(id!);
    }

    update(id: Id, value: T) {
      const item = this.collection.get(String(id));
      Object.assign(item, value);
    }
  }

  return Collection;
};

export function CollectionModel<T extends IAnyModelType>(
  entityModel: T,
) {
  const collectionStore = createCollectionStore<T>(entityModel);

  return ExtendedModel(collectionStore, {});
}
