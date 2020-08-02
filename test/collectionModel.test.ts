import { Model, model, CollectionModel } from '../src';
import { types } from 'mobx-state-tree';

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

    class ACollection extends CollectionModel(AModel) {
      method() {}
    }

    const ACollectionModel = model(ACollection);

    const aCollection = ACollectionModel.create({});

    expect(aCollection).toHaveProperty('method');

    const a = AModel.create({ id: 1 });

    a.action();

    aCollection.add(a.id, a);

    const hasThisModel = aCollection.has(1);

    expect(hasThisModel).toBeTruthy();

    const item = aCollection.get(1);

    expect(item).not.toBeUndefined();
  });
});
