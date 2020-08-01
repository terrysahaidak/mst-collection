import { Model, model } from '../src';

describe('Fabrics', () => {
  it('should allow to create a fabric for model', () => {
    function createCounter(count: number) {
      class Counter extends Model({
        count,
      }) {
        increment() {
          this.count += 1;
        }
      }

      return Counter;
    }

    const Counter2 = createCounter(2);

    const Counter2Model = model(Counter2);

    const m = Counter2Model.create({});

    expect(m.count).toBe(2);

    m.increment();
    expect(m.count).toBe(3);
  });
});
