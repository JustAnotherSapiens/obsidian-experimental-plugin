// Explicit import of all test files

import 'utils/time.test';
import 'utils/generic.test';

import 'components/others/textFormat/func/clean.test';

import 'components/others/referencing/youtubeHelpers/videoIDs.test';
import 'components/others/referencing/youtubeHelpers/channelIDs.test';
import 'components/others/referencing/youtubeHelpers/playlistIDs.test';


// SAMPLE TEST STRUCTURE:

// import { describe, it } from 'node:test';
// import assert from 'assert';

// describe('FunctionName', () => {
//   const validCases: [string, string][] = [
//     ["input1", "expectedOutput1"],
//     ["input2", "expectedOutput2"],
//     // Add more test cases as needed
//   ];

//   validCases.forEach(([input, expected]) => {
//     it(`should convert "${input}" to "${expected}"`, () => {
//       const actual = input; // Replace with the actual function call
//       assert.strictEqual(actual, expected);
//     });
//   });

//   it('should throw an error for invalid input', () => {
//     assert.throws(() => {
//       // Replace with the actual function call that should throw an error
//       throw new Error("Invalid input");
//     }, /Invalid input/);
//   });

// });
