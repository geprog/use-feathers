/* eslint-disable jest/no-standalone-expect */
/* eslint-disable jest/require-top-level-describe */
// adapted from https://github.com/facebook/jest/issues/6121

// run before each test file
const spyError = jest.spyOn(global.console, 'error');
const spyWarn = jest.spyOn(global.console, 'warn');

// run after each test file
afterAll(() => {
  expect(spyError).not.toHaveBeenCalled();

  // Workaround: to ignore warnings from vue component missing emits
  // This happens if we stub a component as a simple <div> and
  // fire emits from it which normally come from the stubbed component
  // TODO: remove if https://github.com/vuejs/vue-test-utils-next/issues/385 has been resolved
  spyWarn.mock.calls = spyWarn.mock.calls.filter((i) => {
    const [message] = i as [string, ...unknown[]];
    return !message.includes('but it is neither declared in the emits option');
  });
  expect(spyWarn).not.toHaveBeenCalled();
});
