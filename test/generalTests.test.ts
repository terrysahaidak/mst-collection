import { types, applySnapshot, getEnv } from 'mobx-state-tree';
import { model, Model, ExtendedModel } from '../src';

describe('creating models', () => {
  class Counter extends Model({
    count: 0,
  }) {
    increment() {
      this.count += 1;
    }

    decrement() {
      this.count += 1;
    }

    get countAnd100() {
      return this.count + 100;
    }
  }

  it('extends Model', () => {
    const CounterModel = model(Counter);
    const counter = CounterModel.create({ count: 1 });

    expect(counter.count).toBe(1);
    counter.increment();
    expect(counter.count).toBe(2);
    expect(counter.countAnd100).toBe(102);
  });

  it('extends ExtendedModel', () => {
    class CounterSuper extends ExtendedModel(Counter, {
      name: 'Test counter',
      created: types.boolean,
    }) {
      setName(value: string) {
        this.name = value;
      }

      get countAnd200() {
        return this.count + 200;
      }

      increment2() {
        this.count += 2;
      }
    }

    const CounterModel = model(CounterSuper);
    const counter = CounterModel.create({ count: 1, created: true });

    expect(counter.count).toBe(1);
    counter.increment();
    expect(counter.count).toBe(2);
    expect(counter.countAnd100).toBe(102);

    expect(counter.countAnd200).toBe(202);
    counter.increment2();
    expect(counter.count).toBe(4);

    expect(counter.name).toBe('Test counter');
    counter.setName('Test');
    expect(counter.name).toBe('Test');
  });

  it('applySnapshot', () => {
    class Counter extends Model({
      count: types.number,
    }) {
      applySnapshotAction() {
        applySnapshot(this, {
          count: 2,
        });
      }
    }

    const CounterModel = model(Counter);
    const counter = CounterModel.create({ count: 1 });

    counter.applySnapshotAction();

    expect(counter.count).toBe(2);
  });
  it('applySnapshot', () => {
    class Counter extends Model({
      count: types.number,
    }) {
      applySnapshotAction() {
        applySnapshot(this, {
          count: 2,
        });
      }
    }

    const CounterModel = model(Counter);
    const counter = CounterModel.create({ count: 1 });

    counter.applySnapshotAction();

    expect(counter.count).toBe(2);
  });

  it('getEnv', () => {
    class Counter extends Model({
      count: types.number,
    }) {
      getEnv() {
        return getEnv(this);
      }
    }

    const CounterModel = model(Counter);
    const counter = CounterModel.create({ count: 1 }, { a: 1 });

    const env = counter.getEnv();

    expect(env).toMatchObject({ a: 1 });
  });

  it('can use null as volatile', () => {
    class A extends Model({
    }) {
      volatileValue = null;
    }

    const AM = model(A);
    const am = AM.create({});

    expect(am.volatileValue).toBe(null);
  })
});
