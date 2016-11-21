const { testResult } = require('./helpers')

//
// e2e tests for build-in functions
//

testResult(`(= 1 1)`, true)
testResult(`(= 1 0)`, false)
testResult(`(< 1 0)`, false)
testResult(`(> 1 0)`, true)
testResult(`(<=> 1 0)`, 1)
testResult(`(<=> 1 1)`, 0)
testResult(`(<=> 0 1)`, -1)

testResult(`(! true)`, false)
testResult(`(! false)`, true)
testResult(`(&& true false)`, false)
testResult(`(&& true true)`, true)
testResult(`(|| true false)`, true)
testResult(`(|| false false)`, false)

testResult(`(cons 1 '(2 3))`, [1, 2, 3])
