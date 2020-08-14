import { types } from 'mobx-state-tree';
import {
  Model,
  model,
  getReferenceParentOfType,
  createNumberEntityRef,
  castEntityRef,
} from '../src';
import { resolveModelReferences } from '../src/entityRef';

describe('EntityRef', () => {
  it('should resolve reference parent with given type', () => {
    class Application extends Model({
      id: types.identifierNumber,
    }) {
      action() {
        // instead of getParent
        const [post] = getReferenceParentOfType(this, PostModel);

        return post;
      }
    }

    const ApplicationModel = model(Application);
    // creating specific reference
    const applicationRef = createNumberEntityRef(
      'applications',
      ApplicationModel,
    );

    class Post extends Model({
      id: types.identifierNumber,
      // we need to use it in order to make things work
      application: types.maybe(applicationRef),
    }) {
      setRef(id: number) {
        // we can assign id directly
        // but TS doesn't like it

        this.application = castEntityRef(id);
      }
    }

    const PostModel = model(Post);

    const EntitiesModel = types.model('EntitiesModel', {
      applications: types.map(ApplicationModel),
      posts: types.map(PostModel),
    });

    const RootModel = types.model('Root', {
      posts: types.array(types.reference(PostModel)),
      entities: types.optional(EntitiesModel, {}),
    });

    const root = RootModel.create({
      posts: [1],
      entities: {
        posts: {
          1: {
            id: 1,
            application: 1,
          },
        },
        applications: {
          1: {
            id: 1,
          },
        },
      },
    });

    const post = root.posts[0];

    post.setRef(1);

    const resolvedPost = post.application!.current.action();

    expect(resolvedPost).not.toBeUndefined();

    expect(resolvedPost!.id).toBe(1);
  });

  it('resolves model references', () => {
    const AModel = model(
      class A extends Model({
        id: types.identifierNumber,
      }) {},
    );
    const ARef = createNumberEntityRef('a', AModel);

    const BModel = model(
      class B extends Model({
        entities: types.model({
          a: types.map(AModel),
        }),
        list1: types.array(ARef),
        ref: ARef,
        refOptional: types.maybe(ARef),
      }) {},
    );

    const b = BModel.create({
      entities: {
        a: {
          1: {
            id: 1,
          },
        },
      },
      // those references are actually models I want to be initialized
      list1: [1, 1, 1, 1],
      ref: 1,
      refOptional: undefined,
    });

    console.log(b.ref.current);

    const references = resolveModelReferences(AModel);

    expect(references).toBeInstanceOf(Array);

    // expect(references!.length).toBe(5);

    // expect(getParent(references[4])).
  });
});
