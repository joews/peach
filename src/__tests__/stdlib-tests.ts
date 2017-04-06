import { testResult } from './helpers'

//
// e2e tests for build-in functions
//

testResult(`1 == 1`, true)
testResult(`1 == 0`, false)
testResult(`1 < 0`, false)
testResult(`1 > 0`, true)
testResult(`1 <=> 0`, 1)
testResult(`1 <=> 1`, 0)
testResult(`0 <=> 1`, -1)

// TODO unary operator syntax
testResult(`!(true)`, false)
testResult(`!(false)`, true)

// TODO logical operator syntax
testResult(`&&(true, false)`, false)
testResult(`&&(true, true)`, true)
testResult(`||(true, false)`, true)
testResult(`||(false, false)`, false)

testResult(`cons(1, [2, 3])`, [1, 2, 3])
