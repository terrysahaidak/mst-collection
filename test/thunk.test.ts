import { model, Model, createThunk } from '../src';

describe('Thunks', () => {
  it('can execute thunk', async () => {
    class Counter extends Model({
      count: 0,
    }) {
      setCount(count: number) {
        this.count = count;
      }

      setCountAsync = createThunk(
        (count: number) =>
          async function (this: Counter) {
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

    expect(counter.setCountAsync.hasEverBeenRun).toBeTruthy();
    expect(counter.setCountAsync.inProgress).toBeFalsy();

    expect(counter.count).toBe(4);
  });

  it('can return value from thunk', async () => {
    class Counter extends Model({
      count: 0,
    }) {
      setCountAsync = createThunk(
        () =>
          async function (this: Counter) {
            await new Promise((res) => setTimeout(res, 100));

            return this.count;
          },
      );
    }
    const CounterModel = model(Counter);
    const counter = CounterModel.create({});

    const value = await counter.setCountAsync.run();

    expect(value).toBe(0);
  });

  it('can use manual thunk', async () => {
    class Counter extends Model({
      count: 0,
    }) {
      setCountAsync = createThunk(
        () =>
          async function (this: Counter, flow) {
            try {
              flow.start();

              throw new Error('Err');
            } catch (err) {
              flow.failed(err);
            }
          },
        false,
      );
    }
    const CounterModel = model(Counter);
    const counter = CounterModel.create({});

    await counter.setCountAsync.run();

    expect(counter.setCountAsync.isError).toBeTruthy();
  });

  it('can handle error', async () => {
    class A extends Model({}) {
      errorTest = createThunk(
        () =>
          async function thunk(this: A) {
            throw new Error('Err');
          },
      );
    }
    const AModel = model(A);
    const a = AModel.create({});

    try {
      await a.errorTest.run();
    } catch {}

    expect(a.errorTest.isError).toBeTruthy();

    expect(a.errorTest.errorMessage).toBe('Err');
  });

  it('can skip', async () => {
    class A extends Model({
      skip: true,
    }) {
      errorTest = createThunk(() => [
        function shouldSkip(this: A) {
          return this.skip;
        },
        async function thunk(this: A) {
          // never run
          return true;
        },
      ]);
    }
    const AModel = model(A);
    const a = AModel.create({});

    const res = await a.errorTest.run();

    expect(res).toBeUndefined();
  });
});
