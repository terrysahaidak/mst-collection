import { types } from 'mobx-state-tree';
import { model, Model, ExtendedModel, createThunk } from '../src';

describe('creating models', () => {
  class Counter extends Model({
    count: types.number,
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
    const counter = CounterModel.create({ count: 1 });

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

  it('uses thunk', async () => {
    class Counter extends Model({
      count: 0,
    }) {
      setCount(count: number) {
        this.count = count;
      }

      setCountAsync = createThunk(
        (count: number) =>
          async function(this: Counter) {
            await new Promise((res) => setTimeout(res, 100));

            this.setCount(count);
          },
      );
    }

    const CounterModel = model(Counter);

    const counter = CounterModel.create({});

    counter.setCount(2);
    expect(counter.count).toBe(2);

    await counter.setCountAsync.run(4);

    expect(counter.setCountAsync.hasEverBeenRan).toBeTruthy();
    expect(counter.setCountAsync.inProgress).toBeFalsy();

    expect(counter.count).toBe(4);
  });
});
