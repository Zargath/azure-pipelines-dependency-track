import Utils from '../src/utils.js'

test('Should return the error message when given an error object', () => {
    const error = {error: 'message'}

    const expected = JSON.stringify('message')
    const actual = Utils.getErrorMessage(error)

    expect(actual).toBe(expected)
});

test('Should return the response message and status code when given a response object', () => {
    const error = {response: {
        statusCode: 404,
        statusMessage: 'Not Found'
    }}

    const expected = `${error.response.statusCode} - ${error.response.statusMessage}`
    const actual = Utils.getErrorMessage(error)

    expect(actual).toBe(expected)
});