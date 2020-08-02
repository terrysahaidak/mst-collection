import { types } from 'mobx-state-tree';
import { model, Model, view } from '../src';

describe('view with params', () => {
  it('can use view with params', () => {
    class Counter extends Model({
      count: types.number,
    }) {
      updateCount() {
        this.count = 2;
      }

      @view getCountPlus(number: number) {
        return this.count + number;
      }
    }

    const CounterModel = model(Counter);
    const counter = CounterModel.create({ count: 1 });

    expect(counter.getCountPlus(1)).toBe(2);

    counter.updateCount();

    expect(counter.getCountPlus(2)).toBe(4);
  });
});
