import { Model, model, RootModel } from '../src';

describe('RootModel', () => {
  it('should create root model', () => {
    class A extends Model({
      id: 1,
    }) {}
    const AModel = model(A);

    class Root extends RootModel({
      a: AModel,
    }) {
      action() {
        return true;
      }
    }

    const MyRootModel = model(Root);

    const rootModel = MyRootModel.create({});

    expect(rootModel).toHaveProperty('a');
    expect(rootModel.a.id).toBe(1);
    expect(rootModel.action()).toBeTruthy();
  });
});
