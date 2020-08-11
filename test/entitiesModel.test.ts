import { Model, model, CollectionModel, EntitiesModel } from '../src';
import { types } from 'mobx-state-tree';
import { schema } from 'normalizr';

describe('CollectionModel', () => {
  it('should create collection model', () => {
    class A extends Model({
      id: types.number,
      prop: 1,
    }) {
      action() {
        this.prop = 2;
      }
    }

    const AModel = model(A);

    const AModelSnapshot = {
      id: 1,
    };

    const ASchema = new schema.Entity('a');

    class ACollection extends CollectionModel(AModel) {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      method() {}
    }

    const ACollectionModel = model(ACollection);

    class RootEntities extends EntitiesModel({
      a: ACollectionModel,
    }) {}

    const RootEntitiesModel = model(RootEntities);

    const e = RootEntitiesModel.create({});

    e.normalizeMerge(AModelSnapshot, ASchema);

    expect(e.a.get(1)?.prop).toBe(1);
  });
});
