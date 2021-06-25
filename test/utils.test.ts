import { getId, PotentialIds } from '~/utils';

describe('getId()', () => {
  it('should return "id" property from item', () => {
    // given
    const item = { id: 1 };

    // then
    expect(getId(item)).toBe(item.id);
  });

  it('should return "_id" property from item', () => {
    // given
    const item = { _id: 1 };

    // then
    expect(getId(item)).toBe(item._id);
  });

  it('should throw error if no id could be retrieved from item', () => {
    // given
    const item = { name: 1 };

    // then
    expect(() => getId(item as PotentialIds)).toThrow('Unable to retrieve id from item');
  });
});
