import { describe, it } from 'node:test';
import assert from 'assert';
import {
  toTitleCase,
  toSentenceCase,
} from './caseTransform';


describe('toTitleCase()', () => {
    const cases = [
        { input: '', expected: '' },
        { input: 'a', expected: 'A' },
        { input: 'hello', expected: 'Hello' },
        { input: 'hello world', expected: 'Hello World' },
        { input: 'HELLO WORLD', expected: 'Hello World' },
        { input: 'hELLo WoRLd', expected: 'Hello World' },
        { input: 'multiple    spaces', expected: 'Multiple    Spaces' },
        // { input: '123abc', expected: '123abc' },

        { input: 'foo-bar', expected: 'Foo-Bar' },
        { input: 'test_with_underscores', expected: 'Test_With_Underscores' },

        { input: 'héllo wörld', expected: 'Héllo Wörld' },
        { input: 'русский текст', expected: 'Русский Текст' },
        { input: 'тест-проверка_пример', expected: 'Тест-Проверка_Пример' },
    ];

    cases.forEach(({ input, expected }) => {
        it(`should convert "${input}" to "${expected}"`, () => {
            assert.strictEqual(toTitleCase(input), expected);
        });
    });

    it('should throw if input is not a string', () => {
        // @ts-expect-error
        assert.throws(() => toTitleCase(null), /Not a string/);
        // @ts-expect-error
        assert.throws(() => toTitleCase(undefined), /Not a string/);
        // @ts-expect-error
        assert.throws(() => toTitleCase(123), /Not a string/);
        // @ts-expect-error
        assert.throws(() => toTitleCase({}), /Not a string/);
    });
});


describe('toSentenceCase()', () => {
    const cases = [
        { input: '', expected: '' },
        { input: 'hello', expected: 'Hello' },
        { input: 'HELLO', expected: 'Hello' },
        { input: 'HELLO. WORLD.', expected: 'Hello. World.' },
        { input: 'sentence one. sentence two. sentence three.', expected: 'Sentence one. Sentence two. Sentence three.' },
        { input: 'heLLo! HOW are yOu?', expected: 'Hello! How are you?' },
        { input: 'this is a sentence... and another.', expected: 'This is a sentence... And another.' },
        { input: "it's over? yes!", expected: "It's over? Yes!" },
        { input: '"quoted." next!', expected: '"Quoted." Next!' },
        { input: 'a.b!c?d', expected: 'A.B!C?D' },
        { input: 'ab. bc! cd? df', expected: 'Ab. Bc! Cd? Df' },

        { input: '   ', expected: '   ' },
        { input: '  multiple    spaces   ', expected: '  Multiple    spaces   ' },
        { input: 'hello\tworld', expected: 'Hello\tWorld' },
        { input: 'foo\nbar', expected: 'Foo\nBar' },

        { input: 'école. für. русский! текст', expected: 'École. Für. Русский! Текст' },

        // No sentence delimiters, should act as a single sentence
        { input: 'abc123', expected: 'Abc123' },
        { input: 'TEST_123', expected: 'Test_123' },
    ];

    cases.forEach(({ input, expected }) => {
        it(`should convert "${input}" to "${expected}"`, () => {
            assert.strictEqual(toSentenceCase(input), expected);
        });
    });

    it('should throw if input is not a string', () => {
        // @ts-expect-error
        assert.throws(() => toSentenceCase(null), /Not a string/);
        // @ts-expect-error
        assert.throws(() => toSentenceCase(undefined), /Not a string/);
        // @ts-expect-error
        assert.throws(() => toSentenceCase(42), /Not a string/);
        // @ts-expect-error
        assert.throws(() => toSentenceCase([]), /Not a string/);
    });
});
