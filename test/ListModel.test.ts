import { types } from 'mobx-state-tree';
import { Model, model, ListModel, RootModel } from '../src';

describe('ListModel', () => {
  it('Can create list model', () => {
    class Todo extends Model({
      id: types.identifierNumber,
      title: types.string,
      isCompleted: false,
    }) {
      toggleCompleted() {
        this.isCompleted = !this.isCompleted;
      }
    }
    const TodoModel = model(Todo);

    class TodoList extends ListModel(TodoModel, {
      fromAttribute: 'title',
      idAttribute: 'id',
    }) {
      fetchList() {
        const todos = [
          TodoModel.create({ id: 1, title: '1' }),
          {
            id: 2,
            title: '2',
          },
        ];

        this.append(todos);
      }
    }
    const TodoListModel = model(TodoList);

    class MyRoot extends RootModel({
      todoList: TodoListModel,
    }) {}

    const MyRootModel = model(MyRoot);

    const root = MyRootModel.create({});

    root.todoList.fetchList();

    expect(root.todoList.count).toBe(2);
  });
});
